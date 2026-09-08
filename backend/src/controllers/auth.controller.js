// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const RepositoryFactory = require('../repositories/factory');
const User = require('../models/user.model');
const environment = require('../config/environment');
const logger = require('../utils/logger');

class AuthController {
  constructor() {
    this._userRepository = null;
  }

  get userRepository() {
    if (!this._userRepository) {
      this._userRepository = RepositoryFactory.getRepository('users');
    }
    return this._userRepository;
  }

  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user exists
      const existingUser = await this.userRepository.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user - MongoDB will generate its own ObjectId
      const userData = new User({
        // Don't set id - let MongoDB generate it
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'customer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await this.userRepository.create(userData);
      logger.info(`User registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user.toJSON ? user.toJSON() : user,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await this.userRepository.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        environment.jwt.secret,
        { expiresIn: environment.jwt.expiresIn }
      );

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        data: {
          token,
          user: user.toJSON ? user.toJSON() : user,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }
}

module.exports = new AuthController();