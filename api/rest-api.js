const isoFetch =require('isomorphic-fetch');
const querystring =require('querystring');
const  URL =require('url').URL;

const AUTH_URL = 'https://oauth.bitrix.info/oauth/token';
const UNAUTHORIZED_ERROR = '401 Unauthorized';

const authorize = async (portal, clientId, clientSecret, basicAuth, lastAuth) => {
  let newAuth = lastAuth;
  if (!newAuth) {
    newAuth = await getAuth(portal, clientId, clientSecret, basicAuth);
  }
  const refreshed = newAuth.refreshed;
  const expiresIn = newAuth.expires_in;
  if (!refreshed || !expiresIn) {
    newAuth = refreshAuth(newAuth);
    return newAuth;
  }
  const refreshedTime = Date.parse(refreshed);
  const expiresInTime = (expiresIn * 1000) / 2;
  if ((Date.now() - refreshedTime) >= expiresInTime) {
    newAuth = refreshAuth(newAuth);
    return newAuth;
  }
  return newAuth;
};

const getAuth = async (portal, clientId, clientSecret, basicAuth) => {
  const response = await isoFetch(
    buildQuery(`${portal}/oauth/authorize`, { client_id: clientId }),
    {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}` },
      redirect: 'manual',
    },
  );
  // console.log(response)
  if (response.status === 302) {
    const redirectUrl = new URL(response.headers.get('location'));
    const cookie = response.headers.get('Set-Cookie');
    const code = redirectUrl.searchParams.get('code');
    if (!code || !cookie) {
      throw new Error(UNAUTHORIZED_ERROR);
    }
    return getAccessToken(code, cookie, clientId, clientSecret);
  }
  throw new Error(UNAUTHORIZED_ERROR);
};

const getAccessToken = async (code, cookie, clientId, clientSecret) => {
  const request = buildQuery(AUTH_URL, {
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
  });
  const response = await isoFetch(
    request,
    {
      method: 'POST',
      headers: { Cookie: cookie },
    },
  );
  if (response.ok) {
    const json = await response.json();
    return { ...json, clientId, clientSecret, refreshed: new Date() };
  }
  throw new Error(UNAUTHORIZED_ERROR);
};

const refreshAuth = async (userAuth) => {
  const oauthReq = buildQuery(AUTH_URL, {
    grant_type: 'refresh_token',
    client_id: userAuth.clientId,
    client_secret: userAuth.clientSecret,
    refresh_token: userAuth.refresh_token,
  });
  const response = await isoFetch(oauthReq);
  if (response.ok) {
    const json = await response.json();
    return { ...userAuth, ...json, refreshed: new Date() };
  }
  throw new Error(UNAUTHORIZED_ERROR);
};

const buildQueryParams = (obj, numPrefix, tempKey) => {
  const outputString = [];
  Object.keys(obj).forEach((val) => {
    let key = val;
    if (numPrefix && !isNaN(key)) {
      key = numPrefix + key;
    }
    key = encodeURIComponent(String(key).replace(/[!'()*]/g, querystring.escape));
    if (tempKey) {
      key = `${tempKey}[${key}]`;
    }
    if (obj[val] === null) {
      outputString.push(`${key}=null`);
      return;
    }
    if (typeof obj[val] === 'object') {
      const query = buildQueryParams(obj[val], null, key);
      outputString.push(query);
    } else {
      const value = encodeURIComponent(String(obj[val]).replace(/[!'()*]/g, querystring.escape));
      outputString.push(`${key}=${value}`);
    }
  });
  return outputString.join('&');
};

const buildQuery = (url, params, qsep = '/?') =>
  `${url}${qsep}${buildQueryParams(params)}`;

const createResponse = json => Object.freeze({
  json: () => {return json},
  data: () => json.result,
  error: () => json.error,
  total: () => json.total,
  more: () => json.next && (json.total - json.next),
  next: () => json.next,
  status: () => json.status || 200,
});

const createBatchResponse = (
  {
    result,
    result_error,
    result_total,
    result_next,
  },
  queries,
  auth,
  portal,
) =>
  queries.map((query, i) => createResponse(
    {
      result: result[i],
      error: result_error[i],
      total: result_total[i],
      next: result_next[i],
    },
    query[0],
    query[1],
    auth,
    portal,
  ));

const callMethod = async (method, params, auth, portal) => {
  const response = await isoFetch(
    buildQuery(`${portal}/rest/${method}`, { ...params, auth }),
    { method: 'POST' },
  );
  if (response.ok) {
    const json = await response.json();
    return createResponse(json, method, params, auth, portal);
  }
  return createResponse({
    error: response.statusText,
    status: response.status,
  });
};

const callBatch = async (queries, auth, portal) => {
  console.log(JSON.stringify(queries));
  const cmd = queries.map(item => buildQuery(item[0], item[1], '?'));
  const response = await isoFetch(
    buildQuery(`${portal}/rest/batch`, { cmd, auth }),
    { method: 'POST' },
  );
  if (response.ok) {
    const json = await response.json();
    return createBatchResponse(json.result, queries, auth, portal);
  }
  return queries.map(() => createResponse({
    error: response.statusText,
    status: response.status,
  }));
};

module.exports={
  authorize,
  getAuth,
  refreshAuth,
  buildQuery,
  buildQueryParams,
  callMethod,
  callBatch,
};
