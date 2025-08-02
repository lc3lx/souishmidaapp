# SMM Integration Guide

This document provides a comprehensive guide on how to integrate and use the SMM (Social Media Marketing) functionality in the application.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## Overview

The SMM integration allows the application to interact with multiple SMM service providers, manage orders, and track their status. The system supports multiple providers and provides a unified interface to work with them.

## Setup

### Prerequisites

- Node.js 14.x or higher
- MongoDB 4.4 or higher
- API keys from SMM providers

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your API keys and database configuration.

### Database Setup

1. Make sure MongoDB is running
2. The application will automatically create the necessary collections on first run

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JUSTANOTHERPANEL_API_KEY` | API key for Just Another Panel | `abc123` |
| `SMMKINGS_API_KEY` | API key for SMM Kings | `def456` |
| `SECERS_API_KEY` | API key for Secsers | `ghi789` |
| `DATABASE` | MongoDB connection string | `mongodb://localhost:27017/your_database` |

## API Endpoints

### Providers

- `GET /api/v1/smm/providers` - Get all providers
- `POST /api/v1/smm/providers` - Add a new provider
- `GET /api/v1/smm/providers/:id` - Get provider by ID
- `PUT /api/v1/smm/providers/:id` - Update provider
- `DELETE /api/v1/smm/providers/:id` - Delete provider
- `PATCH /api/v1/smm/providers/:id/toggle` - Toggle provider status
- `POST /api/v1/smm/providers/:id/sync` - Sync provider services
- `GET /api/v1/smm/providers/:id/services` - Get provider services

### Orders

- `GET /api/v1/smm/orders` - Get all orders
- `POST /api/v1/smm/orders` - Create a new order
- `GET /api/v1/smm/orders/:id` - Get order by ID
- `POST /api/v1/smm/orders/:id/cancel` - Cancel order
- `POST /api/v1/smm/orders/:id/refill` - Request order refill

## Usage Examples

### Initialize Providers

To initialize the default SMM providers, run:

```bash
npm run init-smm-providers USER_ID
```

Replace `USER_ID` with the ID of the user who will own these providers.

### Create a New Order

```javascript
const response = await fetch('/api/v1/smm/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    providerId: 'provider_id_here',
    serviceId: 'service_id_here',
    link: 'https://example.com/post',
    quantity: 1000,
    customComments: ['Great post!', 'Awesome content!']
  })
});

const data = await response.json();
console.log(data);
```

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify that the API key is correct and has the necessary permissions
   - Check if the API key has expired

2. **Connection Issues**
   - Verify that your internet connection is stable
   - Check if the SMM provider's API is up and running

3. **Database Issues**
   - Make sure MongoDB is running
   - Check the database connection string in your `.env` file

### Logs

Check the application logs for detailed error messages. Common log locations:

- Console output when running in development mode
- Application logs in production

## Support

For additional support, please contact the development team or refer to the API documentation of the respective SMM providers.
