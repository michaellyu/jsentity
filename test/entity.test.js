const entity = require('../index');

const structure = {
  table: 't_user',
  pk: 'id',
  fields: ['id', 'name', 'age'],
};

const User = entity.new(structure);

const data = {
  id: 1,
  name: 'Junjun',
  age: 18,
};

const user = new User(data);

test('should initial the private properties', () => {
  expect(user.__table).toBe(structure.table);
  expect(user.__pk).toBe(structure.pk);
  expect(user.__fields.length).toBe(structure.fields.length);
  expect(user.__fields).toContain(structure.fields[0]);
  expect(user.__fields).toContain(structure.fields[2]);
  expect(user.__fields).toContain(structure.fields[2]);
  expect(user.__modifies.length).toBe(0);
});

test('should observed the fields changes', () => {
  user.name = 'Qsir';
  expect(user.__modifies.length).toBe(1);
  expect(user.__modifies).toContain('name');
  user.age = 19;
  expect(user.__modifies.length).toBe(2);
  expect(user.__modifies).toContain('age');
  user.name = 'Wen';
  expect(user.__modifies.length).toBe(2);
});
