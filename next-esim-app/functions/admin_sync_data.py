#!/usr/bin/env python3
"""
Admin script to manually sync data from DataPlans API to Firestore
Run this script periodically to update countries, regions, and plans data
"""

import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables
load_dotenv()

# DataPlans API configuration
BASE_URL = 'https://sandbox.dataplans.io/api/v1'
JWT_TOKEN = os.environ.get('DATAPLANS_API_TOKEN') or os.environ.get('DATAPLANS')

if not JWT_TOKEN:
    print("❌ Error: DATAPLANS_API_TOKEN not found in environment variables")
    exit(1)

def get_headers():
    return {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Try to use service account key if available
        if os.path.exists('serviceAccountKey.json'):
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized with service account")
        else:
            # Use default credentials (for Cloud environment)
            firebase_admin.initialize_app()
            print("✅ Firebase initialized with default credentials")
        
        return firestore.client()
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("💡 Make sure you have:")
        print("   1. serviceAccountKey.json in the current directory, OR")
        print("   2. GOOGLE_APPLICATION_CREDENTIALS environment variable set, OR")
        print("   3. Running in Google Cloud environment")
        exit(1)

def fetch_countries():
    """Fetch countries from DataPlans API"""
    print("\n🌍 Fetching countries from DataPlans API...")
    try:
        response = requests.get(f'{BASE_URL}/countries', headers=get_headers(), timeout=30)
        response.raise_for_status()
        countries = response.json()
        print(f"✅ Fetched {len(countries)} countries")
        return countries
    except Exception as e:
        print(f"❌ Failed to fetch countries: {e}")
        return []

def fetch_regions():
    """Fetch regions from DataPlans API"""
    print("\n🗺️ Fetching regions from DataPlans API...")
    try:
        response = requests.get(f'{BASE_URL}/regions', headers=get_headers(), timeout=30)
        response.raise_for_status()
        regions = response.json()
        print(f"✅ Fetched {len(regions)} regions")
        return regions
    except Exception as e:
        print(f"❌ Failed to fetch regions: {e}")
        return []

def fetch_plans():
    """Fetch plans from DataPlans API"""
    print("\n📱 Fetching plans from DataPlans API...")
    try:
        response = requests.get(f'{BASE_URL}/plans', headers=get_headers(), timeout=30)
        response.raise_for_status()
        plans = response.json()
        print(f"✅ Fetched {len(plans)} plans")
        return plans
    except Exception as e:
        print(f"❌ Failed to fetch plans: {e}")
        return []

def sync_countries_to_firestore(db, countries):
    """Sync countries to Firestore"""
    if not countries:
        print("⚠️ No countries to sync")
        return 0
    
    print(f"\n📥 Syncing {len(countries)} countries to Firestore...")
    batch = db.batch()
    synced_count = 0
    
    for country in countries:
        country_code = country.get('countryCode', '')
        country_name = country.get('countryName', '')
        
        if not country_code or not country_name:
            print(f"⚠️ Skipping invalid country: {country}")
            continue
        
        country_ref = db.collection('countries').document(country_code)
        batch.set(country_ref, {
            'code': country_code,
            'name': country_name,
            'status': 'active',
            'updated_at': firestore.SERVER_TIMESTAMP,
            'synced_at': datetime.now().isoformat()
        }, merge=True)
        
        synced_count += 1
        
        # Commit in batches of 500 (Firestore limit)
        if synced_count % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"📦 Committed batch of {synced_count} countries")
    
    # Commit remaining items
    if synced_count % 500 != 0:
        batch.commit()
    
    print(f"✅ Successfully synced {synced_count} countries to Firestore")
    return synced_count

def sync_regions_to_firestore(db, regions):
    """Sync regions to Firestore"""
    if not regions:
        print("⚠️ No regions to sync")
        return 0
    
    print(f"\n📥 Syncing {len(regions)} regions to Firestore...")
    batch = db.batch()
    synced_count = 0
    
    for region in regions:
        region_slug = region.get('slug', '')
        region_name = region.get('name', '')
        
        if not region_slug or not region_name:
            print(f"⚠️ Skipping invalid region: {region}")
            continue
        
        region_ref = db.collection('regions').document(region_slug)
        batch.set(region_ref, {
            'slug': region_slug,
            'name': region_name,
            'status': 'active',
            'updated_at': firestore.SERVER_TIMESTAMP,
            'synced_at': datetime.now().isoformat()
        }, merge=True)
        
        synced_count += 1
    
    batch.commit()
    print(f"✅ Successfully synced {synced_count} regions to Firestore")
    return synced_count

def sync_plans_to_firestore(db, plans):
    """Sync plans to Firestore"""
    if not plans:
        print("⚠️ No plans to sync")
        return 0
    
    print(f"\n📥 Syncing {len(plans)} plans to Firestore...")
    batch = db.batch()
    synced_count = 0
    
    for plan in plans:
        plan_slug = plan.get('slug', '')
        plan_name = plan.get('name', '')
        
        if not plan_slug or not plan_name:
            print(f"⚠️ Skipping invalid plan: {plan}")
            continue
        
        # Extract country codes from the plan
        country_codes = plan.get('countries', [])
        
        plan_ref = db.collection('plans').document(plan_slug)
        batch.set(plan_ref, {
            'slug': plan_slug,
            'name': plan_name,
            'description': plan.get('description', ''),
            'price': plan.get('price', 0),
            'currency': plan.get('priceCurrency', 'USD'),
            'capacity': plan.get('capacity', 0),
            'period': plan.get('period', 0),
            'country_codes': country_codes,
            'region': plan.get('region', ''),
            'operator': plan.get('operator', ''),
            'status': 'active',
            'updated_at': firestore.SERVER_TIMESTAMP,
            'synced_at': datetime.now().isoformat()
        }, merge=True)
        
        synced_count += 1
        
        # Commit in batches of 500 (Firestore limit)
        if synced_count % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"📦 Committed batch of {synced_count} plans")
    
    # Commit remaining items
    if synced_count % 500 != 0:
        batch.commit()
    
    print(f"✅ Successfully synced {synced_count} plans to Firestore")
    return synced_count

def create_sync_log(db, results):
    """Create a sync log entry"""
    log_ref = db.collection('sync_logs').document()
    log_ref.set({
        'timestamp': firestore.SERVER_TIMESTAMP,
        'countries_synced': results.get('countries', 0),
        'regions_synced': results.get('regions', 0),
        'plans_synced': results.get('plans', 0),
        'status': 'completed',
        'source': 'admin_sync_script'
    })
    print(f"📝 Created sync log entry")

def main():
    print("🚀 DataPlans to Firestore Sync Tool")
    print("=" * 50)
    
    # Initialize Firebase
    db = init_firebase()
    
    # Fetch data from DataPlans API
    countries = fetch_countries()
    regions = fetch_regions()
    plans = fetch_plans()
    
    # Sync to Firestore
    results = {}
    results['countries'] = sync_countries_to_firestore(db, countries)
    results['regions'] = sync_regions_to_firestore(db, regions)
    results['plans'] = sync_plans_to_firestore(db, plans)
    
    # Create sync log
    create_sync_log(db, results)
    
    # Summary
    print("\n📊 Sync Summary")
    print("=" * 50)
    print(f"Countries synced: {results['countries']}")
    print(f"Regions synced: {results['regions']}")
    print(f"Plans synced: {results['plans']}")
    print(f"Total items: {sum(results.values())}")
    
    if sum(results.values()) > 0:
        print("\n🎉 Data sync completed successfully!")
        print("💡 Your Flutter app can now read this data directly from Firestore")
    else:
        print("\n⚠️ No data was synced. Please check API connectivity and credentials.")

if __name__ == "__main__":
    main()
