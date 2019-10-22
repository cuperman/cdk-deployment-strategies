const TABLE_NAME = process.env.TABLE_NAME;

async function create(event) {
  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      table: TABLE_NAME,
      event
    })
  };
}
exports.create = create;

async function list(event) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      table: TABLE_NAME,
      event
    })
  };
}
exports.list = list;
