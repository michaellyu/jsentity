module.exports = newEntity;

function newEntity(structure) {
  const NewEntity = Entity.bind(null, structure);
  defineReadonlyProperty(NewEntity, 'Structure', structure);
  return NewEntity;
}

class Entity {
  constructor({ table, pk, fields }, data) {
    if (!data) {
      data = {};
    }
    definePrivateProperty(this, '__data', data);
    definePrivateProperty(this, '__table', table);
    definePrivateProperty(this, '__pk', pk);
    definePrivateProperty(this, '__modifies', []);
    if (!fields) {
      fields = Object.keys(data);
    }
    definePrivateProperty(this, '__fields', fields);
    defineFields(this, data);
  }
};

function defineFields(entity, data) {
  entity
    .__fields
    .map(field => ([field, data[field]]))
    .forEach(([field, value]) => {
      Object
        .defineProperty(entity, field, {
          configurable: false,
          enumerable: true,
          get() {
            return value;
          },
          set(newValue) {
            value = newValue;
            if (!entity.__modifies.includes(field) && field !== entity.__pk) {
              entity.__modifies.push(field);
            }
          },
        });
    });
}

function definePrivateProperty(entity, field, value) {
  Object
    .defineProperty(entity, field, {
      configurable: false,
      enumerable: false,
      get() {
        return value;
      },
      set(newValue) {
        if (!value) {
          value = newValue;
        }
      },
    });
}

function defineReadonlyProperty(entity, field, value) {
  Object
    .defineProperty(entity, field, {
      configurable: false,
      enumerable: false,
      writable: false,
      value,
    });
}
