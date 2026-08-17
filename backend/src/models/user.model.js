/**
 * User Model (DTO - Data Transfer Object)
 * This represents the business entity, not DB-specific
 */
class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password; // Will be hashed
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role || 'customer'; // 'customer' | 'admin'
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Remove sensitive data when sending to client
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Validation schema (can use Joi)
  static validate(data) {
    // Implementation with Joi
  }
}

module.exports = User;