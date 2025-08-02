const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { initializeDefaultProviders } = require('./utils/SMMProviderSetup');
const dbConnection = require('./config/database');

// Load environment variables
dotenv.config({ path: '.env' });

// Connect to database
dbConnection();

// Initialize default providers
async function init() {
  try {
    console.log('🚀 Starting SMM providers initialization...');
    
    // Get user ID from command line arguments or use default
    const userId = process.argv[2] || 'YOUR_USER_ID';
    
    if (userId === 'YOUR_USER_ID') {
      console.warn('⚠️  Warning: Using default user ID. Please provide a valid user ID as an argument.');
      console.warn('   Example: node initSMMProviders.js 60d0fe4f5311236168a109ca');
    }
    
    console.log(`🔑 User ID: ${userId}`);
    
    // Get API keys from environment variables
    const apiKeys = {
      justanotherpanel: process.env.JUSTANOTHERPANEL_API_KEY || 'your_justanotherpanel_api_key',
      smmkings: process.env.SMMKINGS_API_KEY || 'your_smmkings_api_key',
      secsers: process.env.SECERS_API_KEY || 'your_secsers_api_key'
    };
    
    console.log('🔌 API Keys:');
    console.log(`   - Just Another Panel: ${apiKeys.justanotherpanel ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - SMM Kings: ${apiKeys.smmkings ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Secsers: ${apiKeys.secsers ? '✅ Set' : '❌ Missing'}`);
    
    console.log('\n🔄 Initializing default providers...');
    const result = await initializeDefaultProviders(userId, apiKeys);
    
    if (result && result.length > 0) {
      console.log('\n✅ Successfully initialized default providers:');
      result.forEach(provider => {
        console.log(`   - ${provider.displayName} (${provider.name})`);
      });
    } else {
      console.log('\nℹ️  No new providers were initialized. They may already exist.');
    }
    
    console.log('\n✨ SMM providers initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing SMM providers:');
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
init();
