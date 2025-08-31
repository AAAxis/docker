#!/usr/bin/env python3
"""
Test script for DataPlans API integration
Run this to verify the API connection is working
"""

import requests
import json

# Your DataPlans credentials
BASE_URL = 'https://sandbox.dataplans.io/api/v1'
JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiJkMzdmNjExZi04MmQ5LTQ0OWYtODQ5NS1kMTdmZjAyNDkyNGYiLCJpYXQiOjE3NTU1OTI4OTEsImV4cCI6MjYxOTUwNjQ5MX0._v10gTezxg7i86Xt5a1B48pOStlvpn8MWob0jd91FSU'

def get_headers():
    return {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }

def test_countries():
    """Test fetching countries"""
    print("\n🌍 Testing Countries API...")
    try:
        response = requests.get(f'{BASE_URL}/countries', headers=get_headers(), timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Raw response type: {type(data)}")
            
            # Handle different response formats
            if isinstance(data, list):
                countries = data
            else:
                countries = data.get('countries', data.get('data', []))
            
            print(f"✅ Found {len(countries)} countries")
            
            # Show first few countries
            for i, country in enumerate(countries[:5]):
                if isinstance(country, dict):
                    print(f"  {i+1}. {country.get('name', 'Unknown')} ({country.get('code', 'N/A')})")
                else:
                    print(f"  {i+1}. {country}")
            
            if len(countries) > 5:
                print(f"  ... and {len(countries) - 5} more")
                
            # Show sample data structure
            if countries and isinstance(countries[0], dict):
                print(f"Sample country data: {countries[0]}")
            
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def test_regions():
    """Test fetching regions"""
    print("\n🗺️ Testing Regions API...")
    try:
        response = requests.get(f'{BASE_URL}/regions', headers=get_headers(), timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Raw response type: {type(data)}")
            
            # Handle different response formats
            if isinstance(data, list):
                regions = data
            else:
                regions = data.get('regions', data.get('data', []))
            
            print(f"✅ Found {len(regions)} regions")
            
            # Show all regions
            for i, region in enumerate(regions):
                if isinstance(region, dict):
                    print(f"  {i+1}. {region.get('name', 'Unknown')} ({region.get('slug', 'N/A')})")
                else:
                    print(f"  {i+1}. {region}")
            
            # Show sample data structure
            if regions and isinstance(regions[0], dict):
                print(f"Sample region data: {regions[0]}")
            
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def test_plans():
    """Test fetching plans"""
    print("\n📱 Testing Plans API...")
    try:
        response = requests.get(f'{BASE_URL}/plans', headers=get_headers(), timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Raw response type: {type(data)}")
            
            # Handle different response formats
            if isinstance(data, list):
                plans = data
            else:
                plans = data.get('plans', data.get('data', []))
            
            print(f"✅ Found {len(plans)} plans")
            
            # Show first few plans with details
            for i, plan in enumerate(plans[:3]):
                print(f"\n  Plan {i+1}: {plan.get('name', 'Unknown')}")
                print(f"    Slug: {plan.get('slug', 'N/A')}")
                print(f"    Price: {plan.get('price', 'N/A')} {plan.get('priceCurrency', '')}")
                print(f"    Capacity: {plan.get('capacity', 'N/A')}")
                print(f"    Period: {plan.get('period', 'N/A')}")
                
                countries = plan.get('countries', [])
                if countries:
                    country_names = [c.get('name', 'Unknown') for c in countries[:3]]
                    print(f"    Countries: {', '.join(country_names)}")
                    if len(countries) > 3:
                        print(f"    ... and {len(countries) - 3} more")
            
            if len(plans) > 3:
                print(f"\n  ... and {len(plans) - 3} more plans")
            
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    print("🧪 DataPlans API Test Suite")
    print("=" * 40)
    
    # Test all endpoints
    results = {
        'countries': test_countries(),
        'regions': test_regions(),
        'plans': test_plans()
    }
    
    print("\n📊 Test Results:")
    print("=" * 40)
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.capitalize()}: {status}")
    
    all_passed = all(results.values())
    print(f"\nOverall: {'🎉 ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    
    if all_passed:
        print("\n🚀 Your DataPlans API integration is ready!")
        print("You can now deploy the Firebase Functions.")
    else:
        print("\n🔧 Please check your API credentials and try again.")

if __name__ == "__main__":
    main()
