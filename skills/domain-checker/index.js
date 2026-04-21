#!/usr/bin/env node
/**
 * Domain Checker Skill for OpenClaw
 * Check domain availability directly from chat
 */

const { checkDomain, checkMultipleDomains } = require('./domain-checker');

/**
 * Handle /domain-check command
 */
async function handleDomainCheck(message, params = {}) {
  const domain = params.domain;
  
  if (!domain) {
    return '❌ Usage: /domain-check <domain>\nExample: /domain-check c.io';
  }
  
  try {
    const result = await checkDomain(domain, params);
    return `🌐 **Domain Availability Check**\n\n${JSON.stringify(result, null, 2)}`;
  } catch (error) {
    return `❌ Error checking ${domain}: ${error.message}`;
  }
}

/**
 * Handle batch domain check
 */
async function handleBatchCheck(domains, params = {}) {
  try {
    const results = await checkMultipleDomains(domains, params);
    return `🌐 **Multiple Domain Checks**\n\n${results}`;
  } catch (error) {
    return `❌ Batch error: ${error.message}`;
  }
}

// Register skill handler
module.exports = {
  name: 'domain-checker',
  version: '1.0.0',
  commands: {
    '/domain-check': handleDomainCheck,
    '/check-domain': handleDomainCheck,
    '/domains': handleBatchCheck
  },
  handlers: {
    async domainCheck(message, params) {
      return handleDomainCheck(message, params);
    },
    async batchCheck(message, params) {
      return handleBatchCheck(params.domains, params);
    }
  }
};
