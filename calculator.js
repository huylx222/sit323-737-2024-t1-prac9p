const express = require('express');
const winston = require('winston');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'calculator-microservice' },
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Configure MongoDB connection
const MONGO_USERNAME = process.env.MONGO_USERNAME || 'calculator-user';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || 'calculator-password';
const MONGO_HOST = process.env.MONGO_HOST || 'mongodb-service';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_DB = process.env.MONGO_DB || 'calculator';

const mongoURI = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err);
  });

// Define Calculation Schema
const calculationSchema = new mongoose.Schema({
  operation: {
    type: String,
    required: true,
    enum: ['add', 'subtract', 'multiply', 'divide', 'exponentiate', 'sqrt', 'modulo', 'factorial', 'log']
  },
  num1: {
    type: Number,
    required: true
  },
  num2: Number,
  result: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Calculation = mongoose.model('Calculation', calculationSchema);

// Helper function to save calculation to MongoDB - add this before your routes
const saveCalculation = async (operation, num1, num2, result) => {
  try {
    const calculation = new Calculation({
      operation,
      num1,
      num2: num2 !== null ? num2 : undefined,
      result
    });
    await calculation.save();
    logger.info(`Saved ${operation} calculation to database`);
  } catch (err) {
    logger.error(`Error saving calculation: ${err.message}`);
  }
};

// Add a new endpoint for history - add this with your other routes
app.get('/history', async (req, res) => {
  try {
    const history = await Calculation.find().sort({ timestamp: -1 }).limit(100);
    res.json({ history });
  } catch (err) {
    logger.error(`Error fetching calculation history: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve calculation history' });
  }
});

// Database health check - add this with your other routes
app.get('/db-health', async (req, res) => {
  try {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ 
      status,
      dbName: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const validateInput = (req, res, next) => {
  const { num1, num2 } = req.query;
  if (!num1 || isNaN(num1)) {
    logger.error('Invalid input for num1');
    return res.status(400).json({ error: 'Invalid input for num1' });
  }
  req.num1 = parseFloat(num1);
  
  if (num2 !== undefined && isNaN(num2)) {
    logger.error('Invalid input for num2');
    return res.status(400).json({ error: 'Invalid input for num2' });
  }
  req.num2 = num2 !== undefined ? parseFloat(num2) : null;
  next();
};

app.get('/add', validateInput, async (req, res) => {
  const result = req.num1 + req.num2;
  logger.info(`Addition operation: ${req.num1} + ${req.num2} = ${result}`);
  
  // Save calculation to MongoDB
  await saveCalculation('add', req.num1, req.num2, result);
  
  res.json({ result });
});

app.get('/subtract', validateInput, async (req, res) => {
  const result = req.num1 - req.num2;
  logger.info(`Subtraction operation: ${req.num1} - ${req.num2} = ${result}`);

  // Save calculation to MongoDB
  await saveCalculation('subtract', req.num1, req.num2, result);

  res.json({ result });
});

app.get('/multiply', validateInput, async (req, res) => {
  const result = req.num1 * req.num2;
  logger.info(`Multiplication operation: ${req.num1} * ${req.num2} = ${result}`);

  // Save calculation to MongoDB
  await saveCalculation('multiply', req.num1, req.num2, result);

  res.json({ result });
});

app.get('/divide', validateInput, async (req, res) => {
  if (req.num2 === 0) {
    logger.error('Division by zero error');
    return res.status(400).json({ error: 'Cannot divide by zero' });
  }
  const result = req.num1 / req.num2;
  logger.info(`Division operation: ${req.num1} / ${req.num2} = ${result}`);

  // Save calculation to MongoDB
  await saveCalculation('divide', req.num1, req.num2, result);

  res.json({ result });
});

// Exponentiation
app.get('/exponentiate', validateInput, (req, res) => {
  const result = Math.pow(req.num1, req.num2);
  logger.info(`Exponentiation operation: ${req.num1} ^ ${req.num2} = ${result}`);
  res.json({ result });
});

// Square Root
app.get('/sqrt', validateInput, (req, res) => {
  if (req.num1 < 0) {
    logger.error('Square root of negative number error');
    return res.status(400).json({ error: 'Cannot calculate the square root of a negative number' });
  }
  const result = Math.sqrt(req.num1);
  logger.info(`Square root operation: √${req.num1} = ${result}`);
  res.json({ result });
});

// Modulo
app.get('/modulo', validateInput, (req, res) => {
  if (req.num2 === 0) {
    logger.error('Modulo by zero error');
    return res.status(400).json({ error: 'Cannot perform modulo by zero' });
  }
  const result = req.num1 % req.num2;
  logger.info(`Modulo operation: ${req.num1} % ${req.num2} = ${result}`);
  res.json({ result });
});

// Factorial
app.get('/factorial', validateInput, (req, res) => {
  if (req.num1 < 0 || !Number.isInteger(req.num1)) {
    logger.error('Invalid input for factorial: must be a non-negative integer');
    return res.status(400).json({ error: 'Factorial requires a non-negative integer' });
  }
  
  let result = 1;
  for (let i = 2; i <= req.num1; i++) {
    result *= i;
  }
  
  logger.info(`Factorial operation: ${req.num1}! = ${result}`);
  res.json({ result });
});

// Logarithm
app.get('/log', validateInput, (req, res) => {
  if (req.num1 <= 0) {
    logger.error('Logarithm of non-positive number error');
    return res.status(400).json({ error: 'Cannot calculate logarithm of a non-positive number' });
  }
  
  if (req.num2 !== null) {
    // Custom base logarithm
    if (req.num2 <= 0 || req.num2 === 1) {
      logger.error('Invalid logarithm base');
      return res.status(400).json({ error: 'Logarithm base must be positive and not equal to 1' });
    }
    
    const result = Math.log(req.num1) / Math.log(req.num2);
    logger.info(`Logarithm operation: log_${req.num2}(${req.num1}) = ${result}`);
    res.json({ result });
  } else {
    // Natural logarithm (base e)
    const result = Math.log(req.num1);
    logger.info(`Natural logarithm operation: ln(${req.num1}) = ${result}`);
    res.json({ result });
  }
});

app.listen(PORT, () => {
  console.log(`Calculator microservice is running on http://localhost:${PORT}`);
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});