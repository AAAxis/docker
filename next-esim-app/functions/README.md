# Firebase Functions - Production vs Development

This directory contains Firebase Functions with a clear separation between production and development environments.

## Function Endpoints

### Production Functions (Stable)
- **`analyze_meal_image_production`** - Stable version of meal analysis
  - Endpoint: `/analyze_meal_image_production`
  - Use this for production apps and stable features
  - Contains tested and validated code

### Development Functions (Experimental)
- **`analyze_meal_image_development`** - Development version of meal analysis
  - Endpoint: `/analyze_meal_image_development`
  - Use this for testing new features and experimental changes
  - Can be modified without affecting production

### Shared Functions
- **`create_payment_intent`** - Stripe payment processing
  - Used by both production and development

## Usage

### For Production Apps
Use the production endpoint:
```javascript
// Production endpoint
const response = await fetch('/analyze_meal_image_production', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_url: 'https://example.com/image.jpg',
    image_name: 'meal.jpg'
  })
});
```

### For Development/Testing
Use the development endpoint:
```javascript
// Development endpoint
const response = await fetch('/analyze_meal_image_development', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_url: 'https://example.com/image.jpg',
    image_name: 'meal.jpg'
  })
});
```

## Deployment

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
# Deploy only production function
firebase deploy --only functions:analyze_meal_image_production

# Deploy only development function
firebase deploy --only functions:analyze_meal_image_development
```

## Development Workflow

1. **Make changes to development function** - Modify `analyze_meal_image_development` for testing
2. **Test thoroughly** - Use the development endpoint to test new features
3. **Promote to production** - Once tested, copy the working code to `analyze_meal_image_production`
4. **Deploy production** - Deploy the production function with the new features

## Environment Variables

Both functions use the same environment variables:
- `STRIPE_SECRET_KEY` - For payment processing
- `OPENAI_API_KEY` - For image analysis (configured in openai_helper.py)

## File Structure

```
functions/
├── main.py                    # Main functions file
├── openai_helper.py          # OpenAI integration
├── config.py                 # Configuration
├── requirements.txt          # Python dependencies
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## Notes

- The development function can be modified freely without affecting production users
- Both functions use the same underlying `openai_helper.py` module
- Error handling and response formats are identical between both functions
- The production function should only be updated after thorough testing with the development version 