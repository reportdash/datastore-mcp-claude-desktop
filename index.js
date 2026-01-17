#!/usr/bin/env node
// goto folder, increment version then run > npm publish --access public

const https = require('https');
const http = require('http');
const readline = require('readline');
const { URL } = require('url');

// Configuration
const API_KEY = process.env.REPORTDASH_API_KEY;
const API_URL = process.env.REPORTDASH_API_URL || 'https://datastore.reportdash.com/api/mcp/v1';

// Validate configuration
if (!API_KEY) {
  // In Claude MCP mode, stdout should be JSON only. This is fatal anyway, so ok.
  process.stdout.write(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message:
          'REPORTDASH_API_KEY environment variable is required. Get your API key from ReportDash DataStore (https://datastore.reportdash.com)> Destinations > API Access.',
      },
      id: null,
    }) + '\n'
  );
  process.exit(1);
}

/**
 * Ensure every outbound request includes platform="claude"
 */
function withClaudePlatform(mcpRequest) {
  if (mcpRequest && typeof mcpRequest === 'object') {
    if (mcpRequest.platform == null) mcpRequest.platform = 'claude';
  }
  return mcpRequest;
}

/**
 * Preserve id=0. Only default when null/undefined.
 */
function rpcId(req) {
  return req?.id ?? null;
}

/**
 * Write exactly one JSON object per line to stdout (MCP framing).
 */
function writeJson(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/**
 * Build a JSON-RPC error response
 */
function rpcError({ id = null, code = -32603, message = 'Internal error', data }) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return { jsonrpc: '2.0', id, error: err };
}

// Test mode (prints human logs to stdout; do not run in Claude MCP mode)
if (process.argv.includes('--test')) {
  testConnection();
  return;
}

// MCP Server: Read from stdin, forward to API, write to stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', (line) => {
  if (!line.trim()) return;

  let mcpRequest;
  try {
    mcpRequest = JSON.parse(line);
  } catch (error) {
    writeJson(
      rpcError({
        id: null,
        code: -32700,
        message: 'Parse error: ' + error.message,
      })
    );
    return;
  }

  forwardToAPI(withClaudePlatform(mcpRequest));
});

function forwardToAPI(mcpRequest) {
  const url = new URL(API_URL);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const body = JSON.stringify(mcpRequest);

  const hasId = mcpRequest && Object.prototype.hasOwnProperty.call(mcpRequest, 'id');
  const reqId = hasId ? mcpRequest.id : undefined;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Api-Key': API_KEY,
      'User-Agent': 'ReportDash-DataStore-MCP/1.0',
    },
    timeout: 30000,
  };

  const req = client.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      // Notifications MUST NOT get responses
      if (!hasId) return;

      // 204 / empty => empty result
      if (res.statusCode === 204 || !data.trim()) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: reqId, result: {} }) + '\n');
        } else {
          process.stdout.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: reqId,
              error: { code: res.statusCode, message: `API error: ${res.statusCode} (empty body)` },
            }) + '\n'
          );
        }
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32603,
              message: 'API returned non-JSON response',
              data: { statusCode: res.statusCode, body: data },
            },
          }) + '\n'
        );
        return;
      }

      // Success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // If backend returned a JSON-RPC object, enforce id
        if (parsed && typeof parsed === 'object' && parsed.jsonrpc === '2.0') {
          if (!Object.prototype.hasOwnProperty.call(parsed, 'id')) parsed.id = reqId;
          // IMPORTANT: never allow null id
          if (parsed.id === null) parsed.id = reqId;
          process.stdout.write(JSON.stringify(parsed) + '\n');
        } else {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: reqId, result: parsed }) + '\n');
        }
      } else {
        // Error
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: res.statusCode,
              message: `API error: ${res.statusCode}`,
              data: parsed,
            },
          }) + '\n'
        );
      }
    });
  });

  req.on('error', (error) => {
    if (!hasId) return; // notification: no response
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        error: { code: -32603, message: 'Network error: ' + error.message },
      }) + '\n'
    );
  });

  req.on('timeout', () => {
    req.destroy();
    if (!hasId) return; // notification: no response
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        error: { code: -32603, message: 'Request timeout after 30 seconds' },
      }) + '\n'
    );
  });

  req.write(body);
  req.end();
}


function testConnection() {
  console.log('🔍 Testing ReportDash DataStore connection...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(
    `API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`
  );

  const url = new URL(API_URL);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const mcpRequest = withClaudePlatform({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 'test-connection',
  });

  const postData = JSON.stringify(mcpRequest);

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'ReportDash-DataStore-MCP/1.0',
    },
    timeout: 10000,
  };

  console.log('📡 Sending MCP tools/list request...\n');

  const req = client.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`Response Status: ${res.statusCode}\n`);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (res.statusCode === 204 || !data.trim()) {
          console.log('✅ Connection successful!');
          console.log('✅ API key is valid');
          console.log('ℹ️  Server returned 204 No Content\n');
        } else {
          try {
            const response = JSON.parse(data);
            console.log('✅ Connection successful!');
            console.log('✅ API key is valid\n');

            if (response.result && response.result.tools) {
              console.log(`📦 Available Tools: ${response.result.tools.length}\n`);
              response.result.tools.slice(0, 5).forEach((tool, index) => {
                console.log(`${index + 1}. ${tool.name}`);
                console.log(`   ${tool.description}\n`);
              });
              if (response.result.tools.length > 5) {
                console.log(`... and ${response.result.tools.length - 5} more tools`);
              }
            } else {
              console.log('Response:', JSON.stringify(response, null, 2));
            }
          } catch (e) {
            console.log('✅ Connection successful but response parsing failed');
            console.log('Raw response:', data);
          }
        }

        console.log('\n🎉 You can now use ReportDash DataStore in Claude Desktop!');
        console.log('\nTry asking Claude: "list my reportdash datastore sources"');
      } else {
        console.log('❌ Connection failed');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        console.log('\n💡 Check your API key in ReportDash DataStore (https://datastore.reportdash.com)> Destinations > API Access');
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Connection error:', error.message);
    console.log('\n💡 Check your internet connection and API URL');
  });

  req.on('timeout', () => {
    req.destroy();
    console.log('❌ Connection timeout');
    console.log('\n💡 Check your internet connection');
  });

  req.write(postData);
  req.end();
}
