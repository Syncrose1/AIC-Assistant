/**
 * ML Backend Test Suite
 * 
 * Comprehensive testing for the ML Backend Service
 * Run with: cd airi-mods/services/ml-backend && python -m pytest tests/ -v
 * 
 * Tests cover:
 * - Service startup/shutdown
 * - All API endpoints
 * - Error handling
 * - Performance benchmarks
 * - Resource monitoring
 * - Model inference quality
 */

import pytest
import asyncio
import aiohttp
import time
import psutil
import numpy as np
from typing import Dict, Any, List
import subprocess
import signal
import os
from datetime import datetime

# Test configuration
BASE_URL = "http://127.0.0.1:8000"
MAX_RETRIES = 30
RETRY_DELAY = 1  # seconds
PERFORMANCE_THRESHOLD_MS = 100  # Max acceptable latency for emotion detection
BFA_THRESHOLD_MS = 500  # Max acceptable latency for BFA (10s audio)

# Test data
TEST_TEXTS = {
    "joy": [
        "I am so happy today!",
        "This is wonderful news!",
        "I love this so much!",
    ],
    "sadness": [
        "I feel so sad about this",
        "This makes me cry",
        "I'm heartbroken",
    ],
    "anger": [
        "I am furious right now!",
        "This makes me so angry!",
        "I hate this situation!",
    ],
    "fear": [
        "I am terrified",
        "This is so scary",
        "I'm afraid of what might happen",
    ],
    "surprise": [
        "Oh my god! I can't believe it!",
        "Wow, that's shocking!",
        "I never expected this!",
    ],
    "neutral": [
        "The weather is cloudy today",
        "I went to the store",
        "This is a statement",
    ],
    "disgust": [
        "This is disgusting",
        "I can't stand this",
        "This makes me sick",
    ]
}

TEST_AUDIO_PATH = "tests/test_assets/test_audio.wav"

# Fixtures
@pytest.fixture(scope="module")
def service_process():
    """Start the ML backend service for testing"""
    import subprocess
    import time
    
    # Start service
    process = subprocess.Popen(
        ["python", "-m", "uvicorn", "src.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="/home/raahats/AI-Assistant-Project/airi-mods/services/ml-backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    
    # Wait for service to be ready
    time.sleep(5)
    
    yield process
    
    # Cleanup
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()

@pytest.fixture
async def http_client():
    """Create async HTTP client"""
    async with aiohttp.ClientSession() as session:
        yield session

# Helper functions
async def wait_for_service(max_retries: int = MAX_RETRIES) -> bool:
    """Wait for service to be ready"""
    import aiohttp
    
    for i in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BASE_URL}/health") as resp:
                    if resp.status == 200:
                        return True
        except:
            pass
        await asyncio.sleep(RETRY_DELAY)
    return False

def get_system_resources() -> Dict[str, Any]:
    """Get current system resource usage"""
    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "memory_available_gb": psutil.virtual_memory().available / (1024**3),
        "disk_usage_percent": psutil.disk_usage('/').percent,
    }

# Health Check Tests
class TestHealth:
    """Test suite for health check endpoint"""
    
    @pytest.mark.asyncio
    async def test_health_endpoint_exists(self, http_client):
        """Verify health endpoint returns 200"""
        async with http_client.get(f"{BASE_URL}/health") as resp:
            assert resp.status == 200
    
    @pytest.mark.asyncio
    async def test_health_response_structure(self, http_client):
        """Verify health response has required fields"""
        async with http_client.get(f"{BASE_URL}/health") as resp:
            data = await resp.json()
            assert "status" in data
            assert "device" in data
            assert "models_loaded" in data
            assert "timestamp" in data
            assert data["status"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_health_models_loaded(self, http_client):
        """Verify models are reported as loaded"""
        async with http_client.get(f"{BASE_URL}/health") as resp:
            data = await resp.json()
            assert data["models_loaded"]["emotion"] == True
            assert data["models_loaded"]["aligner"] == True
    
    @pytest.mark.asyncio
    async def test_health_timestamp_valid(self, http_client):
        """Verify timestamp is valid ISO format"""
        async with http_client.get(f"{BASE_URL}/health") as resp:
            data = await resp.json()
            try:
                datetime.fromisoformat(data["timestamp"])
            except ValueError:
                pytest.fail("Invalid timestamp format")

# Emotion Detection Tests
class TestEmotionDetection:
    """Test suite for emotion detection endpoint"""
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("emotion,test_texts", TEST_TEXTS.items())
    async def test_emotion_detection_accuracy(self, http_client, emotion, test_texts):
        """Test that emotions are detected correctly for each category"""
        for text in test_texts:
            async with http_client.post(
                f"{BASE_URL}/emotion/detect",
                json={"text": text}
            ) as resp:
                assert resp.status == 200
                data = await resp.json()
                
                # Verify structure
                assert "emotion" in data
                assert "confidence" in data
                assert "all_emotions" in data
                assert "processing_time_ms" in data
                
                # Verify confidence is reasonable
                assert 0 <= data["confidence"] <= 1
                
                # For clearly emotional texts, check top emotion matches
                if emotion != "neutral":
                    assert data["emotion"] == emotion, \
                        f"Expected {emotion} for '{text[:30]}...', got {data['emotion']}"
    
    @pytest.mark.asyncio
    async def test_emotion_detection_empty_text(self, http_client):
        """Test handling of empty text"""
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={"text": ""}
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["emotion"] == "neutral"
            assert data["confidence"] == 1.0
    
    @pytest.mark.asyncio
    async def test_emotion_detection_whitespace_text(self, http_client):
        """Test handling of whitespace-only text"""
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={"text": "   \n\t   "}
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["emotion"] == "neutral"
    
    @pytest.mark.asyncio
    async def test_emotion_detection_markdown(self, http_client):
        """Test that markdown formatting doesn't break detection"""
        text = "**I am so happy!** This is *amazing*!"
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={"text": text}
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            # Should still detect joy despite markdown
            assert data["emotion"] in ["joy", "neutral"]
    
    @pytest.mark.asyncio
    async def test_emotion_detection_long_text(self, http_client):
        """Test handling of long text"""
        long_text = "I am happy! " * 100  # 1200 characters
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={"text": long_text}
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert "emotion" in data

# Phoneme Alignment Tests
class TestPhonemeAlignment:
    """Test suite for phoneme alignment endpoint"""
    
    @pytest.mark.asyncio
    async def test_align_phonemes_missing_audio(self, http_client):
        """Test error handling for missing audio file"""
        async with http_client.post(
            f"{BASE_URL}/align/phonemes",
            json={"text": "hello", "audio_path": "/nonexistent/audio.wav"}
        ) as resp:
            assert resp.status == 400
            data = await resp.json()
            assert "detail" in data
    
    @pytest.mark.asyncio
    async def test_align_phonemes_empty_text(self, http_client):
        """Test handling of empty text"""
        # Create dummy audio file for test
        dummy_audio = "tests/test_assets/silence.wav"
        if os.path.exists(dummy_audio):
            async with http_client.post(
                f"{BASE_URL}/align/phonemes",
                json={"text": "", "audio_path": dummy_audio}
            ) as resp:
                # Should either succeed with empty result or fail gracefully
                assert resp.status in [200, 400, 422]

# Performance Tests
class TestPerformance:
    """Performance benchmarking tests"""
    
    @pytest.mark.asyncio
    async def test_emotion_detection_latency(self, http_client):
        """Verify emotion detection meets latency requirements"""
        latencies = []
        
        for _ in range(10):
            start = time.time()
            async with http_client.post(
                f"{BASE_URL}/emotion/detect",
                json={"text": "I am happy today!"}
            ) as resp:
                await resp.json()
                latency = (time.time() - start) * 1000
                latencies.append(latency)
        
        avg_latency = np.mean(latencies)
        max_latency = np.max(latencies)
        
        print(f"\nEmotion Detection Performance:")
        print(f"  Average latency: {avg_latency:.2f}ms")
        print(f"  Max latency: {max_latency:.2f}ms")
        print(f"  Min latency: {np.min(latencies):.2f}ms")
        
        assert avg_latency < PERFORMANCE_THRESHOLD_MS, \
            f"Average latency {avg_latency:.2f}ms exceeds threshold {PERFORMANCE_THRESHOLD_MS}ms"
    
    @pytest.mark.asyncio
    async def test_health_check_latency(self, http_client):
        """Verify health check is fast"""
        latencies = []
        
        for _ in range(10):
            start = time.time()
            async with http_client.get(f"{BASE_URL}/health") as resp:
                await resp.json()
                latency = (time.time() - start) * 1000
                latencies.append(latency)
        
        avg_latency = np.mean(latencies)
        assert avg_latency < 50, f"Health check too slow: {avg_latency:.2f}ms"
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, http_client):
        """Test handling of concurrent requests"""
        async def make_request(i):
            async with http_client.post(
                f"{BASE_URL}/emotion/detect",
                json={"text": f"Test request {i}"}
            ) as resp:
                return resp.status
        
        # Make 10 concurrent requests
        tasks = [make_request(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        
        # All should succeed
        assert all(status == 200 for status in results), \
            f"Some requests failed: {results}"

# Resource Monitoring Tests
class TestResourceUsage:
    """Test resource consumption"""
    
    @pytest.mark.asyncio
    async def test_memory_usage(self, http_client):
        """Monitor memory usage during inference"""
        initial_resources = get_system_resources()
        
        # Make many requests
        for i in range(50):
            async with http_client.post(
                f"{BASE_URL}/emotion/detect",
                json={"text": f"Test {i}"}
            ) as resp:
                await resp.json()
        
        final_resources = get_system_resources()
        
        print(f"\nResource Usage:")
        print(f"  Initial memory: {initial_resources['memory_available_gb']:.2f}GB")
        print(f"  Final memory: {final_resources['memory_available_gb']:.2f}GB")
        print(f"  CPU: {final_resources['cpu_percent']:.1f}%")
        
        # Memory shouldn't spike excessively
        memory_diff = initial_resources['memory_available_gb'] - final_resources['memory_available_gb']
        assert memory_diff < 2.0, f"Memory usage increased by {memory_diff:.2f}GB"

# Error Handling Tests
class TestErrorHandling:
    """Test error handling and edge cases"""
    
    @pytest.mark.asyncio
    async def test_invalid_json(self, http_client):
        """Test handling of invalid JSON"""
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        ) as resp:
            assert resp.status in [400, 422]
    
    @pytest.mark.asyncio
    async def test_missing_fields(self, http_client):
        """Test handling of missing required fields"""
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={}  # Missing 'text' field
        ) as resp:
            assert resp.status in [400, 422]
    
    @pytest.mark.asyncio
    async def test_wrong_method(self, http_client):
        """Test that wrong HTTP method returns error"""
        async with http_client.get(f"{BASE_URL}/emotion/detect") as resp:
            assert resp.status == 405  # Method Not Allowed

# Model Quality Tests
class TestModelQuality:
    """Test quality of model outputs"""
    
    @pytest.mark.asyncio
    async def test_emotion_confidence_distribution(self, http_client):
        """Verify emotion confidence scores are reasonable"""
        confidences = []
        
        for emotion, texts in TEST_TEXTS.items():
            for text in texts[:2]:  # Test 2 per emotion
                async with http_client.post(
                    f"{BASE_URL}/emotion/detect",
                    json={"text": text}
                ) as resp:
                    data = await resp.json()
                    confidences.append(data["confidence"])
        
        avg_confidence = np.mean(confidences)
        min_confidence = np.min(confidences)
        
        print(f"\nConfidence Stats:")
        print(f"  Average: {avg_confidence:.3f}")
        print(f"  Min: {min_confidence:.3f}")
        print(f"  Max: {np.max(confidences):.3f}")
        
        # Average confidence should be reasonable
        assert avg_confidence > 0.5, f"Average confidence too low: {avg_confidence}"
    
    @pytest.mark.asyncio
    async def test_emotion_all_labels_present(self, http_client):
        """Verify all emotions appear in all_emotions response"""
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={"text": "This is a test"}
        ) as resp:
            data = await resp.json()
            
            emotions_found = {e["label"] for e in data["all_emotions"]}
            expected_emotions = {"anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"}
            
            assert emotions_found == expected_emotions, \
                f"Missing emotions: {expected_emotions - emotions_found}"

# Integration Tests
class TestIntegration:
    """End-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_full_workflow(self, http_client):
        """Test complete workflow: health → emotion → health"""
        # Initial health check
        async with http_client.get(f"{BASE_URL}/health") as resp:
            assert resp.status == 200
        
        # Emotion detection
        async with http_client.post(
            f"{BASE_URL}/emotion/detect",
            json={"text": "I am happy!"}
        ) as resp:
            assert resp.status == 200
            data = await resp.json()
            assert data["emotion"] == "joy"
        
        # Final health check
        async with http_client.get(f"{BASE_URL}/health") as resp:
            assert resp.status == 200
    
    @pytest.mark.asyncio
    async def test_service_stability(self, http_client):
        """Test that service remains stable under load"""
        errors = []
        
        for i in range(100):
            try:
                async with http_client.post(
                    f"{BASE_URL}/emotion/detect",
                    json={"text": f"Test {i}"}
                ) as resp:
                    if resp.status != 200:
                        errors.append(f"Request {i}: HTTP {resp.status}")
            except Exception as e:
                errors.append(f"Request {i}: {str(e)}")
        
        error_rate = len(errors) / 100
        print(f"\nStability Test:")
        print(f"  Total requests: 100")
        print(f"  Errors: {len(errors)}")
        print(f"  Error rate: {error_rate*100:.1f}%")
        
        if errors:
            print(f"  First 5 errors: {errors[:5]}")
        
        assert error_rate < 0.05, f"Error rate too high: {error_rate*100:.1f}%"

# Cleanup and Reporting
def pytest_sessionfinish(session, exitstatus):
    """Generate test report summary"""
    print("\n" + "="*60)
    print("ML BACKEND TEST SUITE COMPLETE")
    print("="*60)
    
    if exitstatus == 0:
        print("✓ All tests passed!")
    else:
        print(f"✗ Tests failed with exit code {exitstatus}")
    
    print("\nTested:")
    print("  - Health check endpoint")
    print("  - Emotion detection (7 emotions)")
    print("  - Error handling")
    print("  - Performance benchmarks")
    print("  - Resource usage")
    print("  - Concurrent request handling")
    print("="*60)
