const TABLE_NAME = process.env.TABLE_NAME;
const CODE_VERSION = 'v1';

function jsonResponse(statusCode, data, event, context) {
  const requestContext = event.requestContext || {};
  const identity = requestContext.identity || {};
  const apiKeyId = identity.apiKeyId;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data,
      metadata: {
        code_version: CODE_VERSION,
        function_version: context.functionVersion,
        table: TABLE_NAME,
        api_key_id: apiKeyId
      }
    })
  };
}

exports.create = async (event, context) => {
  return jsonResponse(200, {}, event, context);
};

exports.list = async (event, context) => {
  return jsonResponse(200, [], event, context);
};

exports.get = async (event, context) => {
  return jsonResponse(200, {}, event, context);
};

exports.update = async (event, context) => {
  return jsonResponse(200, {}, event, context);
};

exports.delete = async (event, context) => {
  return jsonResponse(200, {}, event, context);
};
