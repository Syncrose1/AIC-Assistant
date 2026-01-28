#!/usr/bin/env python3
#!/usr/bin/env python3
#
# ML Backend Service - Comprehensive Diagnostic Tool
#
# Run this to check:
# - Service health and availability
# - All endpoints functionality
# - Model inference quality
# - Performance metrics
# - Resource usage
# - Error scenarios
#
# Usage:
#   cd airi-mods/services/ml-backend
#   python scripts/test_service.py
#
# Or run specific tests:
#   python scripts/test_service.py --test health
#   python scripts/test_service.py --test emotion
#   python scripts/test_service.py --test performance
#

import sys
import os
import json
import time
import requests
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "http://127.0.0.1:8001"
TIMEOUT = 30

# Test data
TEST_EMOTIONS = {
    "joy": ["I am so happy!", "This is wonderful!", "I love this!"],
    "sadness": ["I feel sad", "This makes me cry", "I'm depressed"],
    "anger": ["I am furious!", "This makes me angry!", "I hate this!"],
    "fear": ["I am scared", "This is terrifying", "I'm afraid"],
    "surprise": ["Wow! Amazing!", "I can't believe it!", "Oh my god!"],
    "neutral": ["The weather is cloudy", "I went to the store", "It's Tuesday"],
    "disgust": ["This is disgusting", "I can't stand this", "That's gross"],
}


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    END = "\033[0m"


def log_success(msg: str):
    print(f"{Colors.GREEN}✓{Colors.END} {msg}")


def log_error(msg: str):
    print(f"{Colors.RED}✗{Colors.END} {msg}")


def log_warning(msg: str):
    print(f"{Colors.YELLOW}⚠{Colors.END} {msg}")


def log_info(msg: str):
    print(f"{Colors.BLUE}ℹ{Colors.END} {msg}")


class MLBackendTester:
    """Comprehensive tester for ML Backend Service"""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.results = []
        self.errors = []

    def test_health(self) -> bool:
        """Test health check endpoint"""
        print("\n" + "=" * 60)
        print("TEST 1: Health Check")
        print("=" * 60)

        try:
            response = requests.get(f"{self.base_url}/health", timeout=TIMEOUT)

            if response.status_code != 200:
                log_error(f"Health check failed: HTTP {response.status_code}")
                self.errors.append(f"Health check: HTTP {response.status_code}")
                return False

            data = response.json()

            # Check required fields
            required_fields = ["status", "device", "models_loaded", "timestamp"]
            for field in required_fields:
                if field not in data:
                    log_error(f"Missing field in health response: {field}")
                    self.errors.append(f"Health check: missing field {field}")
                    return False

            log_success(f"Service status: {data['status']}")
            log_info(f"Device: {data['device']}")
            log_info(
                f"Emotion model: {'✓' if data['models_loaded']['emotion'] else '✗'}"
            )
            log_info(
                f"Aligner model: {'✓' if data['models_loaded']['aligner'] else '✗'}"
            )

            self.results.append(
                {"test": "health", "status": "pass", "device": data["device"]}
            )
            return True

        except requests.exceptions.ConnectionError:
            log_error("Cannot connect to service. Is it running?")
            log_info(f"Expected at: {self.base_url}")
            self.errors.append("Health check: Connection refused")
            return False
        except Exception as e:
            log_error(f"Health check error: {e}")
            self.errors.append(f"Health check: {str(e)}")
            return False

    def test_emotion_detection(self) -> bool:
        """Test emotion detection endpoint"""
        print("\n" + "=" * 60)
        print("TEST 2: Emotion Detection")
        print("=" * 60)

        all_passed = True
        results_by_emotion = {}

        for emotion, test_texts in TEST_EMOTIONS.items():
            print(f"\nTesting {emotion.upper()}...")
            correct = 0
            latencies = []

            for text in test_texts:
                try:
                    start = time.time()
                    response = requests.post(
                        f"{self.base_url}/emotion/detect",
                        json={"text": text},
                        timeout=TIMEOUT,
                    )
                    latency = (time.time() - start) * 1000
                    latencies.append(latency)

                    if response.status_code != 200:
                        log_error(
                            f"Failed for '{text[:30]}...': HTTP {response.status_code}"
                        )
                        all_passed = False
                        continue

                    data = response.json()
                    detected = data.get("emotion", "unknown")
                    confidence = data.get("confidence", 0)

                    if detected == emotion:
                        correct += 1
                        log_success(
                            f"'{text[:40]}...' → {detected} ({confidence:.2f}) [{latency:.1f}ms]"
                        )
                    else:
                        log_warning(
                            f"'{text[:40]}...' → {detected} (expected {emotion}) [{latency:.1f}ms]"
                        )

                except Exception as e:
                    log_error(f"Error testing '{text[:30]}...': {e}")
                    all_passed = False

            accuracy = correct / len(test_texts) if test_texts else 0
            avg_latency = sum(latencies) / len(latencies) if latencies else 0

            results_by_emotion[emotion] = {
                "accuracy": accuracy,
                "avg_latency_ms": avg_latency,
                "correct": correct,
                "total": len(test_texts),
            }

            if accuracy < 0.5 and emotion != "neutral":  # Neutral is often ambiguous
                log_warning(
                    f"{emotion}: {correct}/{len(test_texts)} correct ({accuracy * 100:.0f}%)"
                )
                all_passed = False
            else:
                log_success(
                    f"{emotion}: {correct}/{len(test_texts)} correct ({accuracy * 100:.0f}%) - {avg_latency:.1f}ms avg"
                )

        self.results.append(
            {
                "test": "emotion_detection",
                "status": "pass" if all_passed else "partial",
                "results_by_emotion": results_by_emotion,
            }
        )

        return all_passed

    def test_error_handling(self) -> bool:
        """Test error handling"""
        print("\n" + "=" * 60)
        print("TEST 3: Error Handling")
        print("=" * 60)

        tests_passed = 0
        tests_total = 0

        # Test 1: Empty text
        tests_total += 1
        try:
            response = requests.post(
                f"{self.base_url}/emotion/detect", json={"text": ""}, timeout=TIMEOUT
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("emotion") == "neutral":
                    log_success("Empty text handling: Returns neutral")
                    tests_passed += 1
                else:
                    log_warning("Empty text handling: Unexpected emotion")
            else:
                log_warning(f"Empty text handling: HTTP {response.status_code}")
        except Exception as e:
            log_error(f"Empty text handling failed: {e}")

        # Test 2: Missing field
        tests_total += 1
        try:
            response = requests.post(
                f"{self.base_url}/emotion/detect", json={}, timeout=TIMEOUT
            )
            # Should return 400 or 422
            if response.status_code in [400, 422]:
                log_success("Missing field handling: Returns error code")
                tests_passed += 1
            else:
                log_warning(
                    f"Missing field handling: Unexpected HTTP {response.status_code}"
                )
        except Exception as e:
            log_error(f"Missing field handling failed: {e}")

        # Test 3: Invalid JSON
        tests_total += 1
        try:
            response = requests.post(
                f"{self.base_url}/emotion/detect",
                data="invalid json",
                headers={"Content-Type": "application/json"},
                timeout=TIMEOUT,
            )
            if response.status_code in [400, 422]:
                log_success("Invalid JSON handling: Returns error code")
                tests_passed += 1
            else:
                log_warning(f"Invalid JSON handling: HTTP {response.status_code}")
        except Exception as e:
            log_error(f"Invalid JSON handling failed: {e}")

        # Test 4: Wrong HTTP method
        tests_total += 1
        try:
            response = requests.get(f"{self.base_url}/emotion/detect", timeout=TIMEOUT)
            if response.status_code == 405:
                log_success("Wrong method handling: Returns 405")
                tests_passed += 1
            else:
                log_warning(f"Wrong method handling: HTTP {response.status_code}")
        except Exception as e:
            log_error(f"Wrong method handling failed: {e}")

        # Test 5: Nonexistent audio file
        tests_total += 1
        try:
            response = requests.post(
                f"{self.base_url}/align/phonemes",
                json={"text": "hello", "audio_path": "/nonexistent/file.wav"},
                timeout=TIMEOUT,
            )
            if response.status_code == 400:
                log_success("Missing audio handling: Returns 400")
                tests_passed += 1
            else:
                log_warning(f"Missing audio handling: HTTP {response.status_code}")
        except Exception as e:
            log_error(f"Missing audio handling failed: {e}")

        self.results.append(
            {
                "test": "error_handling",
                "status": "pass" if tests_passed == tests_total else "partial",
                "passed": tests_passed,
                "total": tests_total,
            }
        )

        log_info(f"Error handling: {tests_passed}/{tests_total} tests passed")
        return tests_passed == tests_total

    def test_performance(self) -> bool:
        """Test performance benchmarks"""
        print("\n" + "=" * 60)
        print("TEST 4: Performance Benchmarks")
        print("=" * 60)

        # Test emotion detection latency
        print("\nTesting emotion detection latency...")
        latencies = []

        for i in range(20):
            try:
                start = time.time()
                response = requests.post(
                    f"{self.base_url}/emotion/detect",
                    json={"text": f"Test sentence {i}"},
                    timeout=TIMEOUT,
                )
                latency = (time.time() - start) * 1000
                latencies.append(latency)

                if response.status_code != 200:
                    log_error(f"Request {i} failed: HTTP {response.status_code}")
            except Exception as e:
                log_error(f"Request {i} error: {e}")

        if latencies:
            avg_latency = sum(latencies) / len(latencies)
            min_latency = min(latencies)
            max_latency = max(latencies)

            print(f"\nLatency Statistics (20 requests):")
            print(f"  Average: {avg_latency:.2f}ms")
            print(f"  Min: {min_latency:.2f}ms")
            print(f"  Max: {max_latency:.2f}ms")

            # Check against threshold
            threshold = 100  # 100ms
            if avg_latency < threshold:
                log_success(
                    f"Average latency {avg_latency:.2f}ms < {threshold}ms threshold"
                )
                performance_pass = True
            else:
                log_warning(
                    f"Average latency {avg_latency:.2f}ms exceeds {threshold}ms threshold"
                )
                performance_pass = False
        else:
            log_error("No successful requests for performance test")
            performance_pass = False

        self.results.append(
            {
                "test": "performance",
                "status": "pass" if performance_pass else "fail",
                "avg_latency_ms": avg_latency if latencies else None,
                "min_latency_ms": min_latency if latencies else None,
                "max_latency_ms": max_latency if latencies else None,
            }
        )

        return performance_pass

    def test_stability(self) -> bool:
        """Test service stability under load"""
        print("\n" + "=" * 60)
        print("TEST 5: Stability Test (100 sequential requests)")
        print("=" * 60)

        errors = []
        latencies = []

        for i in range(100):
            try:
                start = time.time()
                response = requests.post(
                    f"{self.base_url}/emotion/detect",
                    json={"text": f"Stability test {i}"},
                    timeout=TIMEOUT,
                )
                latency = (time.time() - start) * 1000
                latencies.append(latency)

                if response.status_code != 200:
                    errors.append(f"Request {i}: HTTP {response.status_code}")

                # Print progress every 25 requests
                if (i + 1) % 25 == 0:
                    print(f"  Progress: {i + 1}/100 requests...")

            except Exception as e:
                errors.append(f"Request {i}: {str(e)}")

        error_rate = len(errors) / 100
        avg_latency = sum(latencies) / len(latencies) if latencies else 0

        print(f"\nResults:")
        print(f"  Total requests: 100")
        print(f"  Successful: {100 - len(errors)}")
        print(f"  Errors: {len(errors)}")
        print(f"  Error rate: {error_rate * 100:.1f}%")
        print(f"  Average latency: {avg_latency:.2f}ms")

        if errors:
            print(f"  First 3 errors:")
            for err in errors[:3]:
                print(f"    - {err}")

        stability_pass = error_rate < 0.05  # Less than 5% errors

        if stability_pass:
            log_success(f"Stability test passed ({error_rate * 100:.1f}% error rate)")
        else:
            log_error(f"Stability test failed ({error_rate * 100:.1f}% error rate)")

        self.results.append(
            {
                "test": "stability",
                "status": "pass" if stability_pass else "fail",
                "error_rate": error_rate,
                "total_requests": 100,
                "failed_requests": len(errors),
            }
        )

        return stability_pass

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY REPORT")
        print("=" * 60)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"Service URL: {self.base_url}")
        print("-" * 60)

        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.get("status") == "pass")

        print(f"\nTests Run: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")

        if self.errors:
            print(f"\n{Colors.RED}ERRORS:{Colors.END}")
            for error in self.errors[:10]:  # Show first 10
                print(f"  - {error}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more")

        print(f"\n{Colors.BLUE}Detailed Results:{Colors.END}")
        for result in self.results:
            status_icon = (
                Colors.GREEN + "✓"
                if result.get("status") == "pass"
                else Colors.RED + "✗"
            )
            print(f"  {status_icon} {result['test']}{Colors.END}")

            # Print relevant details
            if "avg_latency_ms" in result and result["avg_latency_ms"]:
                print(f"      Latency: {result['avg_latency_ms']:.2f}ms")
            if "error_rate" in result:
                print(f"      Error rate: {result['error_rate'] * 100:.1f}%")

        print("\n" + "=" * 60)

        if passed_tests == total_tests:
            print(f"{Colors.GREEN}✓ ALL TESTS PASSED{Colors.END}")
            return 0
        else:
            print(f"{Colors.RED}✗ SOME TESTS FAILED{Colors.END}")
            return 1

    def run_all_tests(self) -> int:
        """Run all tests and return exit code"""
        print("=" * 60)
        print("ML BACKEND SERVICE - COMPREHENSIVE DIAGNOSTIC")
        print("=" * 60)
        print(f"Target: {self.base_url}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        # Run all tests
        self.test_health()
        self.test_emotion_detection()
        self.test_error_handling()
        self.test_performance()
        self.test_stability()

        # Generate report
        return self.generate_report()


def main():
    parser = argparse.ArgumentParser(description="ML Backend Service Diagnostic Tool")
    parser.add_argument("--url", default=BASE_URL, help="Service base URL")
    parser.add_argument(
        "--test",
        choices=["health", "emotion", "errors", "performance", "stability", "all"],
        default="all",
        help="Run specific test",
    )
    args = parser.parse_args()

    tester = MLBackendTester(args.url)

    if args.test == "all":
        exit_code = tester.run_all_tests()
    else:
        # Run specific test
        print("=" * 60)
        print(f"Running single test: {args.test}")
        print("=" * 60)

        test_map = {
            "health": tester.test_health,
            "emotion": tester.test_emotion_detection,
            "errors": tester.test_error_handling,
            "performance": tester.test_performance,
            "stability": tester.test_stability,
        }

        success = test_map[args.test]()
        exit_code = 0 if success else 1

        # Print results
        print("\n" + "=" * 60)
        print("TEST RESULT")
        print("=" * 60)
        print(f"Test: {args.test}")
        print(f"Status: {'PASS' if success else 'FAIL'}")
        print("=" * 60)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
