const sqlstring = require('sqlstring');

module.exports = {
  getInsertSql(entity) {
    // INSERT INTO TABLE_1 (FIELD_1, ..., FIELD_n) VALUES (VALUE_1, ..., VALUE_n);SELECT @@IDENTITY;
    const fields = entity.__fields.filter(field => field !== entity.__pk);
    const fieldsPlaceholder = fields.map(() => '??').join(', ');
    const valuesPlaceholder = fields.map(() => '?').join(', ');
    const values = fields.map(field => entity[field]);
    const sql = `INSERT INTO ?? (${fieldsPlaceholder}) VALUES (${valuesPlaceholder});SELECT @@IDENTITY;`;
    const params = [
      entity.__table,
      ...fields,
      ...values,
    ];
    return sqlstring.format(sql, params);
  },
  getUpdateSql(entity) {
    // UPDATE TABLE_1 SET FIELD_1 = ?, ..., FIELD_n = ? WHERE ?? = ?;
    const fields = entity
                    .__modifies
                    .map(() => '?? = ?')
                    .join(', ');
    const sql = `UPDATE ?? SET ${fields} WHERE ?? = ?;`;
    const params = [
      entity.__table,
      ...entity
          .__modifies
          .reduce((acc, key) => {
            acc.push(key);
            acc.push(entity[key]);
            return acc;
          }, []),
      entity.__pk,
      entity[entity.__pk],
    ];
    return sqlstring.format(sql, params);
  },
  getDeleteSql(entity) {
    // DELETE FROM TABLE_1 WHERE ?? = ?;
    const sql = `DELETE FROM ?? WHERE ?? = ?;`;
    const params = [entity.__table, entity.__pk, entity[entity.__pk]];
    return sqlstring.format(sql, params);
  },
  getSelectSql(model, { wheres, orders, limits }) {
    // SELECT FIELD_1, ..., FIELD_n FROM TABLE_1 WHERE CONDITION_1 ORDER BY FIELD_1 ASC, FIELD_2 DESC LIMIT x, y;
    const structure = model && model.Structure ? model.Structure : model;
    const fields = structure.fields.map(() => '??').join(', ');
    const conditions = [];
    const orderbys = [];
    let limit = '';
    const params = [...structure.fields, structure.table];
    if (wheres) {
      fillWhere(wheres);
    }
    if (orders) {
      orders
        .forEach((order) => {
          if (typeof order === 'string') {
            orderbys.push('?? ASC');
            params.push(order);
          } else if (Array.isArray(order)) {
            if (order[1] && order[1].toLowerCase() === 'desc') {
              orderbys.push('?? DESC');
            } else {
              orderbys.push('?? ASC');
            }
            params.push(order[0]);
          }
        });
    }
    if (limits) {
      limit = ' LIMIT ?, ?';
      params.push(...limits);
    }
    const sql = `SELECT ${fields} FROM ??${conditions.length ? ' WHERE ' + conditions.join('') : ''}${orderbys.length ? ' ORDER BY ' + orderbys.join(', ') : ''}${limit};`;
    return sqlstring.format(sql, params);
  
    function fillWhere(where) {
      if (Array.isArray(where)) {
        if (typeof where[0] === 'string') {
          if (conditions.length > 0
              && conditions[conditions.length - 1] !== '('
              && conditions[conditions.length - 1] !== ' AND '
              && conditions[conditions.length - 1] !== ' OR ') {
            conditions.push(' AND ');
          }
          switch (where[1].toLowerCase()) {
            case '=':
            case '!=':
            case '<>':
            case '>':
            case '>=':
            case '<':
            case '<=':
              conditions.push(`?? ${where[1]} ?`);
              params.push(where[0]);
              params.push(where[2]);
              break;
            case 'like':
              conditions.push(`?? LIKE ?`);
              params.push(where[0]);
              params.push(where[2]);
              break;
            case 'notlike':
              conditions.push(`?? NOT LIKE ?`);
              params.push(where[0]);
              params.push(where[2]);
              break;
            case 'null':
              conditions.push(`?? IS NULL`);
              params.push(where[0]);
              break;
            case 'notnull':
              conditions.push(`?? IS NOT NULL`);
              params.push(where[0]);
              break;
            case 'between':
              conditions.push('?? BETWEEN ? AND ?');
              params.push(where[0]);
              params.push(...where[2]);
              break;
            case 'notbetween':
              conditions.push('?? NOT BETWEEN ? AND ?');
              params.push(where[0]);
              params.push(...where[2]);
              break;
            case 'in':
              conditions.push(`?? IN (${where[2].map(() => '?').join(', ')})`);
              params.push(where[0]);
              params.push(...where[2]);
              break;
            case 'notin':
              conditions.push(`?? NOT IN (${where[2].map(() => '?').join(', ')})`);
              params.push(where[0]);
              params.push(...where[2]);
          }
        } else {
          where
            .forEach(wh => fillWhere(wh));
        }
      } else if (Object.prototype.toString.call(where) === '[object Object]') {
        if (where.or) {
          conditions.push(' OR ');
          if (Array.isArray(where.or)) {
            if (typeof where.or[0] === 'string') {
              fillWhere(where.or);
            } else {
              if (where.or.length > 1) {
                conditions.push('(')
              }
              where
                .or
                .forEach(wh => fillWhere(wh));
              if (where.or.length > 1) {
                conditions.push(')')
              }
            }
          }
        } else if (where.and) {
          conditions.push(' AND ');
          if (Array.isArray(where.and)) {
            if (typeof where.and[0] === 'string') {
              fillWhere(where.and);
            } else {
              if (where.and.length > 1) {
                conditions.push('(')
              }
              where
                .and
                .forEach(wh => fillWhere(wh));
              if (where.and.length > 1) {
                conditions.push(')')
              }
            }
          }
        }
      }
    }
  },
  getSingleSql(model, id) {
    // SELECT FIELD_1, ..., FIELD_n FROM TABLE_1 WHERE ?? = ?;
    const structure = model && model.Structure ? model.Structure : model;
    const fields = structure.fields.map(() => '??').join(', ');
    const sql = `SELECT ${fields} FROM ?? WHERE ?? = ? LIMIT 0, 1;`;
    const params = [...structure.fields, structure.table, structure.pk, id];
    return sqlstring.format(sql, params);
  },
  getJoinSql(models, { joins, selects, wheres, orders, limits }) {
    // SELECT TABLE_1.FIELD_1, ..., TABLE_1.FIELD_n FROM TABLE_1 LEFT JOIN TABLE_2 ON TABLE_1.FIELD_1 = TABLE_2.FIELD_1 WHERE CONDITION_1 ORDER BY TABLE_1.FIELD_1 ASC, TABLE_2.FIELD_2 DESC LIMIT x, y;
    let tables = {};
    Object
      .keys(models)
      .forEach((key) => {
        tables[key] = models[key] && models[key].Structure ? models[key].Structure.table : models[key];
      });
    const fields = [];
    const params = [];
    const jointables = [];
    const conditions = [];
    const orderbys = [];
    let limit = '';
    if (Array.isArray(selects)) {
      fillFields(selects);
    }
    if (joins) {
      fillJoin(joins);
    }
    if (wheres) {
      fillWhere(wheres);
    }
    if (orders) {
      fillOrders(orders);
    }
    if (limits) {
      limit = ' LIMIT ?, ?';
      params.push(...limits);
    }
    const sql = `SELECT ${fields.join(', ')} FROM ${jointables.join(' ')}${conditions.length ? ' WHERE ' + conditions.join('') : ''}${orderbys.length ? ' ORDER BY ' + orderbys.join(', ') : ''}${limit};`;
    return sqlstring.format(sql, params);

    function fillFields(selects) {
      selects
        .forEach((select) => {
          if (typeof select === 'string') {
            let [table, field] = select.split('.');
            if (tables[table]) {
              table = tables[table];
            }
            fields.push('??.??');
            params.push(table);
            params.push(field);
          } else if (Array.isArray(select) && select.length === 2 && typeof select[0] === 'string') {
            let [table, field] = select[0].split('.');
            if (tables[table]) {
              table = tables[table];
            }
            fields.push('??.?? AS ?');
            params.push(table);
            params.push(field);
            params.push(select[1]);
          } else if (Array.isArray(select) && select.length > 1 && select[0].Structure) {
            select
              .forEach((field, index) => {
                if (index === 0) return;

                if (Array.isArray(field) && field.length) {
                  fields.push('??.?? AS ?');
                  params.push(select[0].Structure.table);
                  params.push(field[0]);
                  params.push(field[1]);
                } else {
                  fields.push('??.??');
                  params.push(select[0].Structure.table);
                  params.push(field);
                }
              });
          }
        });
    }

    function fillJoin(joins) {
      jointables.push('??');
      joins
        .forEach((join) => {
          let jointable = [];
          let table1;
          let table2;
          if (join.inner) {
            jointable.push('INNER JOIN ?? ON ');
            [table1, table2] = join.inner;
          } else if (join.left) {
            jointable.push('LEFT JOIN ?? ON ');
            [table1, table2] = join.left;
          } else if (join.right) {
            jointable.push('RIGHT JOIN ?? ON ');
            [table1, table2] = join.right;
          }
          if (table1.Structure) {
            table1 = table1.Structure.table;
          } else if (tables[table1]) {
            table1 = tables[table1];
          }
          if (table2.Structure) {
            table2 = table2.Structure.table;
          } else if (tables[table2]) {
            table2 = tables[table2];
          }
          if (jointables.length === 1) {
            params.push(table1);
          }
          params.push(table2);
          if (Array.isArray(join.on)) {
            const ons = [];
            if (typeof join.on[0] === 'string') {
              ons.push(join.on);
            } else if (Array.isArray(join.on[0])) {
              ons.push(...join.on);
            }
            const onwhere = [];
            ons
              .forEach((on) => {
                onwhere.push('??.?? = ??.??');
                params.push(table1);
                params.push(on[0]);
                params.push(table2);
                params.push(on[2]);
              });
            jointable.push(onwhere.join(' AND '))
          }
          jointables.push(jointable.join(''));
        });
    }
  
    function fillWhere(where) {
      if (Array.isArray(where)) {
        if (typeof where[0] === 'string') {
          if (conditions.length > 0
              && conditions[conditions.length - 1] !== '('
              && conditions[conditions.length - 1] !== ' AND '
              && conditions[conditions.length - 1] !== ' OR ') {
            conditions.push(' AND ');
          }
          let [table, field] = where[0].split('.');
          if (tables[table]) {
            table = tables[table];
          }
          switch (where[1].toLowerCase()) {
            case '=':
            case '!=':
            case '<>':
            case '>':
            case '>=':
            case '<':
            case '<=':
              conditions.push(`??.?? ${where[1]} ?`);
              params.push(table);
              params.push(field);
              params.push(where[2]);
              break;
            case 'like':
              conditions.push(`??.?? LIKE ?`);
              params.push(table);
              params.push(field);
              params.push(where[2]);
              break;
            case 'notlike':
              conditions.push(`??.?? NOT LIKE ?`);
              params.push(table);
              params.push(field);
              params.push(where[2]);
              break;
            case 'null':
              conditions.push(`??.?? IS NULL`);
              params.push(table);
              params.push(field);
              break;
            case 'notnull':
              conditions.push(`??.?? IS NOT NULL`);
              params.push(table);
              params.push(field);
              break;
            case 'between':
              conditions.push('??.?? BETWEEN ? AND ?');
              params.push(table);
              params.push(field);
              params.push(...where[2]);
              break;
            case 'notbetween':
              conditions.push('??.?? NOT BETWEEN ? AND ?');
              params.push(table);
              params.push(field);
              params.push(...where[2]);
              break;
            case 'in':
              conditions.push(`??.?? IN (${where[2].map(() => '?').join(', ')})`);
              params.push(table);
              params.push(field);
              params.push(...where[2]);
              break;
            case 'notin':
              conditions.push(`??.?? NOT IN (${where[2].map(() => '?').join(', ')})`);
              params.push(table);
              params.push(field);
              params.push(...where[2]);
          }
        } else {
          where
            .forEach(wh => fillWhere(wh));
        }
      } else if (Object.prototype.toString.call(where) === '[object Object]') {
        if (where.or) {
          conditions.push(' OR ');
          if (Array.isArray(where.or)) {
            if (typeof where.or[0] === 'string' || (where[0] && where[0].Structure)) {
              fillWhere(where.or);
            } else {
              if (where.or.length > 1) {
                conditions.push('(')
              }
              where
                .or
                .forEach(wh => fillWhere(wh));
              if (where.or.length > 1) {
                conditions.push(')')
              }
            }
          }
        } else if (where.and) {
          conditions.push(' AND ');
          if (Array.isArray(where.and)) {
            if (typeof where.and[0] === 'string' || (where[0] && where[0].Structure)) {
              fillWhere(where.and);
            } else {
              if (where.and.length > 1) {
                conditions.push('(')
              }
              where
                .and
                .forEach(wh => fillWhere(wh));
              if (where.and.length > 1) {
                conditions.push(')')
              }
            }
          }
        }
      }
    }

    function fillOrders(orders) {
      orders
        .forEach((order) => {
          if (typeof order === 'string') {
            let [_table, _field] = order.split('.');
            if (_table && _field) {
              if (tables[_table]) {
                _table = tables[_table];
              }
              orderbys.push('??.?? ASC');
              params.push(_table);
              params.push(_field);
            }
          } else if (Array.isArray(order) && order.length) {
            if (order[0].Structure) {
              if (order.length === 2
                  || (order.length === 3 && order[2] && order[2].toLowerCase() === 'asc')) {
                orderbys.push('??.?? ASC');
                params.push(order[0].Structure.table);
                params.push(order[1]);
              } else if (order.length === 3 && order[2] && order[2].toLowerCase() === 'desc') {
                orderbys.push('??.?? DESC');
                params.push(order[0].Structure.table);
                params.push(order[1]);
              }
            } else if (typeof order[0] === 'string') {
              if (order.length === 1
                  || (order.length === 2 && order[2] && order[2].toLowerCase() === 'asc')) {
                let [_table, _field] = order[0].split('.');
                if (_table && _field) {
                  if (tables[_table]) {
                    _table = tables[_table];
                  }
                  orderbys.push('??.?? ASC');
                  params.push(_table);
                  params.push(_field);
                }
              } else if (order.length === 2 && order[1] && order[1].toLowerCase() === 'desc') {
                let [_table, _field] = order[0].split('.');
                if (_table && _field) {
                  if (tables[_table]) {
                    _table = tables[_table];
                  }
                  orderbys.push('??.?? DESC');
                  params.push(_table);
                  params.push(_field);
                }
              }
            }
          }
        });
    }
  },
};
