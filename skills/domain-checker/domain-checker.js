#!/usr/bin/env node
/**
 * Domain Name Availability Checker (Fixed)
 * Uses proper WHOIS lookups with fallback
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const https = require('https');

const execAsync = promisify(exec);

// Cache for results (5 minute TTL)
const resultCache = new Map();

/**
 * Check domain availability via WHOIS command
 */
async function checkDomain(domain, options = {}) {
  const cacheKey = domain;
  
  // Check cache first
  if (resultCache.has(cacheKey)) {
    const cached = resultCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.result;
    }
  }
  
  try {
    // Try WHOIS command first
    const { stdout } = await execAsync(`whois ${domain}`, { timeout: 15000 });
    
    // Parse WHOIS output for availability indicators
    const status = parseWHOIS(stdout, domain);
    
    const result = {
      domain,
      status,
      registry: extractRegistry(stdout),
      details: status === 'available' ? 'Domain available for registration' : 'Domain is already registered',
      expires: extractExpiry(stdout),
      registrar: extractRegistrar(stdout),
      raw: stdout.substring(0, 1000) // First 1000 chars for debugging
    };
    
    // Cache result
    resultCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
    
  } catch (error) {
    // WHOIS command failed, try web lookup
    if (options.web || !options.whois) {
      return await checkViaWeb(domain);
    }
    
    return {
      domain,
      status: 'unknown',
      registry: 'WHOIS failed',
      details: `WHOIS lookup failed: ${error.message}`,
      expires: 'Unknown',
      registrar: 'Unknown'
    };
  }
}

/**
 * Parse WHOIS output to determine availability
 */
function parseWHOIS(whoisOutput, domain) {
  const lowerOutput = whoisOutput.toLowerCase();
  
  // Clear indicators of availability
  if (lowerOutput.includes('no match') ||
      lowerOutput.includes('no object') ||
      lowerOutput.includes('available') ||
      lowerOutput.includes('status: available') ||
      lowerOutput.includes('available for registration')) {
    return 'available';
  }
  
  // Clear indicators of being taken
  if (lowerOutput.includes('domain name') ||
      lowerOutput.includes('registry domain id') ||
      lowerOutput.includes('status: clienttransferprohibited') ||
      lowerOutput.includes('status: clientupdateprohibited') ||
      lowerOutput.includes('registrar:') ||
      lowerOutput.includes('creation date') ||
      lowerOutput.includes('expires') ||
      lowerOutput.includes('name server')) {
    return 'taken';
  }
  
  // Default: assume taken if we got any output
  return 'taken';
}

/**
 * Extract registry info from WHOIS output
 */
function extractRegistry(whoisOutput) {
  const registryMatch = whoisOutput.match(/Registry Domain ID: (\S+)/);
  if (registryMatch) {
    return registryMatch[1];
  }
  
  const domainMatch = whoisOutput.match(/Domain Name: (\S+)/);
  if (domainMatch) {
    return domainMatch[1];
  }
  
  return 'Unknown';
}

/**
 * Extract expiry date from WHOIS output
 */
function extractExpiry(whoisOutput) {
  const expiryMatch = whoisOutput.match(/Expiry Date: (\S+)/i);
  if (expiryMatch) {
    return expiryMatch[1];
  }
  
  const expiresMatch = whoisOutput.match(/Expires On: (\S+)/i);
  if (expiresMatch) {
    return expiresMatch[1];
  }
  
  return 'Unknown';
}

/**
 * Extract registrar info from WHOIS output
 */
function extractRegistrar(whoisOutput) {
  const registrarMatch = whoisOutput.match(/Registrar: (.+)$/im);
  if (registrarMatch) {
    return registrarMatch[1].trim();
  }
  return 'Unknown';
}

/**
 * Fallback: Check via web API
 */
async function checkViaWeb(domain) {
  const tld = domain.split('.').pop();
  
  return new Promise((resolve) => {
    const url = `https://www.whois.com/whois/${domain}`;
    
    https.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => html += chunk);
      res.on('end', () => {
        const isTaken = html.includes('already taken') || 
                       html.includes('is taken') ||
                       html.includes('congrats') === false;
        
        resolve({
          domain,
          status: isTaken ? 'taken' : 'available',
          registry: `Web check (${tld})`,
          details: isTaken ? 'Domain appears taken at registrar' : 'Domain likely available (verify at registrar)',
          expires: 'Unknown',
          registrar: 'Unknown',
          raw: html.substring(0, 200)
        });
      });
    }).on('error', () => {
      resolve({
        domain,
        status: 'unknown',
        registry: 'Web fallback failed',
        details: 'Both WHOIS and web lookup failed',
        expires: 'Unknown',
        registrar: 'Unknown'
      });
    });
  });
}

/**
 * Format result for display
 */
function formatResult(result) {
  const statusIcon = result.status === 'available' ? '✅' : 
                     result.status === 'taken' ? '❌' : '⚠️';
  
  return `
🌐 **Domain:** ${result.domain}
Status: ${statusIcon} **${result.status.toUpperCase()}**
Registry: ${result.registry}
Expires: ${result.expires}
Registrar: ${result.registrar}
${result.details}
`.trim();
}

/**
 * Check multiple domains (batch)
 */
async function checkMultipleDomains(domains, options = {}) {
  const results = [];
  
  for (const domain of domains) {
    try {
      const result = await checkDomain(domain.trim(), options);
      results.push(formatResult(result));
    } catch (error) {
      results.push(`❌ ${domain}: ${error.message}`);
    }
  }
  
  return results.join('\n\n');
}

// Export for use in OpenClaw
module.exports = {
  checkDomain,
  checkMultipleDomains,
  formatResult,
  parseWHOIS,
  extractRegistry,
  extractExpiry,
  extractRegistrar
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: domain-checker <domain1> [domain2] ...');
    console.log('Example: node domain-checker.js c.io xc.io');
    process.exit(1);
  }
  
  (async () => {
    console.log('🔍 Checking domain availability...\n');
    const result = await checkMultipleDomains(args);
    console.log(result);
  })();
}
