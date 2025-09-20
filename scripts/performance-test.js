#!/usr/bin/env node

/**
 * Simple Performance Test Script
 *
 * Quick performance assessment without external dependencies
 */

const { performance } = require('perf_hooks');

// Test rate limiting performance
async function testRateLimitingPerformance() {
  console.log('Testing Rate Limiting Performance...');

  try {
    const { RateLimiter, createRateLimitMiddleware } = require('../lib/security/rate-limit');

    // Create mock request
    const mockRequest = {
      headers: { 'x-forwarded-for': '192.168.1.1' },
      connection: { remoteAddress: '192.168.1.1' },
      body: {}
    };

    const options = {
      windowMs: 60000,
      maxRequests: 100
    };

    // Test 1000 requests
    const startTime = performance.now();
    let successCount = 0;
    let limitedCount = 0;

    const rateLimiter = new RateLimiter(options);

    for (let i = 0; i < 1000; i++) {
      try {
        const result = await rateLimiter.checkLimit(mockRequest);
        if (result.allowed) {
          successCount++;
        } else {
          limitedCount++;
        }
      } catch (error) {
        console.error('Rate limiting error:', error.message);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / 1000;

    console.log(`✅ Rate limiting test completed:`);
    console.log(`   - Total requests: 1000`);
    console.log(`   - Successful: ${successCount}`);
    console.log(`   - Rate limited: ${limitedCount}`);
    console.log(`   - Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   - Average per request: ${avgTime.toFixed(2)}ms`);
    console.log(`   - Requests per second: ${(1000 / (totalTime / 1000)).toFixed(2)}`);

    return {
      success: true,
      avgTime,
      requestsPerSecond: 1000 / (totalTime / 1000)
    };
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test webhook signature verification performance
async function testSignaturePerformance() {
  console.log('\nTesting Webhook Signature Performance...');

  try {
    const { verifyWebhookSignature } = require('../lib/webhooks/verify-signature');

    const testPayload = {
      id: 'test_' + Date.now(),
      type: 'referral.created',
      data: { value: 100, user_id: 'test_user' }
    };

    const secret = 'test-secret';
    const iterations = 1000;

    // Generate test signature
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp}.${JSON.stringify(testPayload)}`;
    const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
    const testSignature = `${timestamp}.${signature}`;

    const startTime = performance.now();
    let validCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const isValid = await verifyWebhookSignature(testPayload, testSignature, secret);
        if (isValid) {
          validCount++;
        }
      } catch (error) {
        // Expected for some tests
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`✅ Signature verification test completed:`);
    console.log(`   - Total verifications: ${iterations}`);
    console.log(`   - Valid signatures: ${validCount}`);
    console.log(`   - Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   - Average per verification: ${avgTime.toFixed(2)}ms`);
    console.log(`   - Verifications per second: ${(iterations / (totalTime / 1000)).toFixed(2)}`);

    return {
      success: true,
      avgTime,
      verificationsPerSecond: iterations / (totalTime / 1000)
    };
  } catch (error) {
    console.error('❌ Signature verification test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test memory usage under load
async function testMemoryUsage() {
  console.log('\nTesting Memory Usage...');

  const initialMemory = process.memoryUsage();
  console.log('Initial memory usage:');
  console.log(`   - RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);

  // Simulate load
  const testArray = [];
  for (let i = 0; i < 10000; i++) {
    testArray.push({
      id: `test_${i}`,
      data: { value: Math.random(), timestamp: Date.now() }
    });
  }

  const loadedMemory = process.memoryUsage();
  console.log('Memory usage under load:');
  console.log(`   - RSS: ${(loadedMemory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Used: ${(loadedMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Total: ${(loadedMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);

  // Calculate memory increase
  const rssIncrease = loadedMemory.rss - initialMemory.rss;
  const heapIncrease = loadedMemory.heapUsed - initialMemory.heapUsed;

  console.log('Memory increase:');
  console.log(`   - RSS: ${(rssIncrease / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap: ${(heapIncrease / 1024 / 1024).toFixed(2)} MB`);

  // Clean up
  testArray.length = 0;
  global.gc && global.gc();

  const finalMemory = process.memoryUsage();
  console.log('Memory after cleanup:');
  console.log(`   - RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  return {
    success: true,
    rssIncrease,
    heapIncrease,
    finalMemory
  };
}

// Test database connection performance (if available)
async function testDatabasePerformance() {
  console.log('\nTesting Database Performance...');

  try {
    const { supabase } = require('../lib/supabase-client');

    const startTime = performance.now();

    // Test simple query
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    const endTime = performance.now();
    const queryTime = endTime - startTime;

    if (error) {
      console.log('⚠️  Database query error (expected if not connected):', error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ Database test completed:`);
    console.log(`   - Query time: ${queryTime.toFixed(2)}ms`);
    console.log(`   - User count: ${data?.count || 'unknown'}`);

    return {
      success: true,
      queryTime,
      userCount: data?.count
    };
  } catch (error) {
    console.log('⚠️  Database test skipped (not connected):', error.message);
    return { success: false, error: error.message };
  }
}

// Run all performance tests
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests\n');
  console.log('='.repeat(60));

  const startTime = performance.now();
  const results = {};

  // Run all tests
  results.rateLimiting = await testRateLimitingPerformance();
  results.signature = await testSignaturePerformance();
  results.memory = await testMemoryUsage();
  results.database = await testDatabasePerformance();

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Performance Test Summary');
  console.log('='.repeat(60));
  console.log(`Total test time: ${totalTime.toFixed(2)}ms`);
  console.log('\nComponent Performance:');

  if (results.rateLimiting.success) {
    console.log(`✅ Rate Limiting: ${results.rateLimiting.requestsPerSecond.toFixed(2)} req/sec`);
  } else {
    console.log(`❌ Rate Limiting: Failed - ${results.rateLimiting.error}`);
  }

  if (results.signature.success) {
    console.log(`✅ Signature Verification: ${results.signature.verificationsPerSecond.toFixed(2)} verifications/sec`);
  } else {
    console.log(`❌ Signature Verification: Failed - ${results.signature.error}`);
  }

  if (results.memory.success) {
    console.log(`✅ Memory Usage: ${(results.memory.heapIncrease / 1024 / 1024).toFixed(2)} MB increase under load`);
  } else {
    console.log(`❌ Memory Usage: Failed`);
  }

  if (results.database.success) {
    console.log(`✅ Database Query: ${results.database.queryTime.toFixed(2)}ms`);
  } else {
    console.log(`⚠️  Database Query: Not available`);
  }

  // Overall assessment
  console.log('\n🎯 Overall Assessment:');
  const successfulTests = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;
  console.log(`Tests passed: ${successfulTests}/${totalTests}`);

  if (successfulTests === totalTests) {
    console.log('🎉 All performance tests passed!');
  } else if (successfulTests >= totalTests * 0.7) {
    console.log('✅ Most performance tests passed');
  } else {
    console.log('⚠️  Some performance tests failed');
  }

  console.log('\nPerformance test completed!');
}

// Run the tests
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = {
  testRateLimitingPerformance,
  testSignaturePerformance,
  testMemoryUsage,
  testDatabasePerformance,
  runPerformanceTests
};