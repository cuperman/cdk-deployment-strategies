const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

const TABLE_NAME = process.env.TABLE_NAME;
const CODE_VERSION = 'v2';

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
  const attributes = event.body ? JSON.parse(event.body) : {};

  const documentClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: TABLE_NAME,
    Item: Object.assign({}, attributes, {
      id: uuid(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  };

  const data = await documentClient.put(params).promise();

  return jsonResponse(201, data, event, context);
};

exports.list = async (event, context) => {
  const documentClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: TABLE_NAME
  };

  const data = await documentClient.scan(params).promise();

  return jsonResponse(200, data.Items, event, context);
};

exports.get = async (event, context) => {
  const pathParams = event.pathParameters || {};
  const id = pathParams.id;

  const documentClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: TABLE_NAME,
    Key: {
      id
    }
  };

  const data = await documentClient.get(params).promise();

  return jsonResponse(200, data.Item, event, context);
};

exports.update = async (event, context) => {
  const pathParams = event.pathParameters || {};
  const id = pathParams.id;
  const newAttributes = event.body ? JSON.parse(event.body) : {};

  const documentClient = new AWS.DynamoDB.DocumentClient();

  const getParams = {
    TableName: TABLE_NAME,
    Key: {
      id
    }
  };

  const getData = await documentClient.get(getParams).promise();

  const putParams = {
    TableName: TABLE_NAME,
    Item: Object.assign({}, getData.Item, newAttributes, {
      updatedAt: Date.now()
    })
  };

  const putData = await documentClient.put(putParams).promise();

  return jsonResponse(200, putData, event, context);
};

exports.delete = async (event, context) => {
  const pathParams = event.pathParameters || {};
  const id = pathParams.id;

  const documentClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: TABLE_NAME,
    Key: {
      id
    }
  };

  const data = await documentClient.delete(params).promise();

  return jsonResponse(200, data, event, context);
};
