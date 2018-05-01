const sqlhelper = require('../mysql-helper');
const entity = require('../index');

const structure = {
  table: 't_user',
  pk: 'id',
  fields: ['id', 'name', 'age'],
};

const User = entity.new(structure);

const structure2 = {
  table: 't_user_info',
  pk: 'id',
  fields: ['id', 'user_id', 'address'],
};

const UserInfo = entity.new(structure2);

const SELECT_SQL_1 = 'SELECT `id`, `name`, `age` FROM `t_user` WHERE `name` = \'Coral\' AND `age` IN (10, 11, 12, 13, 14, 15, 16, 17, 18) AND `age` BETWEEN 13 AND 18 AND `age` IS NOT NULL OR (`age` < 10 OR `age` < 20) AND `age` <> 100 ORDER BY `name` ASC, `age` DESC LIMIT 0, 10;';
const SELECT_SQL_2 = 'SELECT `id`, `name`, `age` FROM `t_user` WHERE `id` = 1 LIMIT 0, 1;';
const SELECT_SQL_3 = 'SELECT `t_user`.`id` AS \'owner_id\', `t_user`.`name`, `t_user`.`age`, `t_user_info`.`address`, `t_user_info`.`address` AS \'user_address\' FROM `t_user` LEFT JOIN `t_user_info` ON `t_user`.`id` = `t_user_info`.`user_id` AND `t_user`.`info_id` = `t_user_info`.`id` RIGHT JOIN `t_user_info` ON `t_user`.`id` = `t_user_info`.`user_id` WHERE `t_user`.`age` > 13 AND `t_user`.`age` < 18 ORDER BY `t_user`.`name` ASC, `t_user`.`name` ASC, `t_user`.`age` DESC, `t_user_info`.`address` ASC LIMIT 0, 10;';
const INSERT_SQL = 'INSERT INTO `t_user` (`name`, `age`) VALUES (\'Wu\', 18);SELECT @@IDENTITY;';
const UPDATE_SQL_1 = 'UPDATE `t_user` SET `name` = \'QSir\' WHERE `id` = 1;';
const UPDATE_SQL_2 = 'UPDATE `t_user` SET `name` = \'QSir\', `age` = 19 WHERE `id` = 1;';
const UPDATE_SQL_3 = 'UPDATE `t_user` SET `name` = \'Wen\', `age` = 19 WHERE `id` = 1;';
const DELETE_SQL = 'DELETE FROM `t_user` WHERE `id` = 2;';

test('should building a select sql', () => {
  expect(sqlhelper.getSelectSql(User, {
    wheres: [
      ['name', '=', 'Coral'],
      ['age', 'in', [10, 11, 12, 13, 14, 15, 16, 17, 18]],
      ['age', 'between', [13, 18]],
      ['age', 'notnull'],
      {
        or: [
          ['age', '<', 10],
          {
            or: ['age', '<', 20],
          },
        ],
      },
      {
        and: ['age', '<>', 100],
      },
    ],
     orders: [
       'name',
       ['age', 'desc'],
     ],
    limits: [0, 10],
  })).toBe(SELECT_SQL_1);

  expect(sqlhelper.getSingleSql(User, 1)).toBe(SELECT_SQL_2);

  expect(sqlhelper.getJoinSql({ u: User, i: UserInfo }, {
    joins: [
      {
        left: [User, UserInfo],
        on: [
          ['id', '=', 'user_id'],
          ['info_id', '=', 'id'],
        ],
      },
      {
        right: [User, UserInfo],
        on: ['id', '=', 'user_id'],
      },
    ],
    selects: [
      [User, ['id', 'owner_id'], 'name', 'age'],
      'i.address',
      ['i.address', 'user_address'],
    ],
    wheres: [
      ['u.age', '>', 13],
      ['u.age', '<', 18],
    ],
    orders: [
      'u.name',
      [User, 'name'],
      ['u.age', 'desc'],
      [UserInfo, 'address', 'asc'],
    ],
    limits: [0, 10],
  })).toBe(SELECT_SQL_3);
});

test('should building an insert sql', () => {
  const data = {
    name: 'Wu',
    age: 18,
  };
  
  const user = new User(data);

  expect(sqlhelper.getInsertSql(user)).toBe(INSERT_SQL);
});

test('should building an update sql', () => {
  const data = {
    id: 1,
    name: 'Junjun',
    age: 18,
  };
  
  const user = new User(data);

  user.name = 'QSir';
  expect(sqlhelper.getUpdateSql(user)).toBe(UPDATE_SQL_1);
  user.age = 19;
  expect(sqlhelper.getUpdateSql(user)).toBe(UPDATE_SQL_2);
  user.name = 'Wen';
  expect(sqlhelper.getUpdateSql(user)).toBe(UPDATE_SQL_3);
});

test('should building a delete sql', () => {
  const data = {
    id: 2,
    name: 'Yuyu',
    age: 18,
  };
  
  const user = new User(data);

  expect(sqlhelper.getDeleteSql(user)).toBe(DELETE_SQL);
});
