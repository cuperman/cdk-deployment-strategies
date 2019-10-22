const TABLE_NAME = process.env.TABLE_NAME;
const CODE_VERSION = 'v1';

async function list(event, context) {
  const requestContext = event.requestContext || {};
  const identity = requestContext.identity || {};
  const apiKeyId = identity.apiKeyId;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code_version: CODE_VERSION,
      function_version: context.functionVersion,
      table: TABLE_NAME,
      apiKeyId
    })
  };
}
exports.list = list;
