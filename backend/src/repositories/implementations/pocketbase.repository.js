const PocketBase = require('pocketbase').default;
const { v4: uuidv4 } = require('uuid');
const IRepository = require('../interfaces/repository.interface');
const environment = require('../../config/environment');

class PocketBaseRepository extends IRepository {
  constructor(collectionName) {
    super();
    this.collectionName = collectionName;
    this.client = new PocketBase(environment.database.pocketbase.url);
    
    // Authenticate once for admin operations
    this.authenticate();
  }

  async authenticate() {
    try {
      const { email, password } = environment.database.pocketbase;
      if (email && password) {
        await this.client.admins.authWithPassword(email, password);
        console.log(`[PocketBase] Authenticated for collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('[PocketBase] Auth failed:', error.message);
      // In development, we can continue without auth if using public collections
      if (environment.nodeEnv === 'production') {
        throw error;
      }
    }
  }

  async create(data) {
    try {
      // Add timestamps if PocketBase doesn't auto-add them
      const record = await this.client.collection(this.collectionName).create({
        ...data,
        id: data.id || uuidv4(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      return record;
    } catch (error) {
      throw new Error(`PocketBase create failed: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const record = await this.client.collection(this.collectionName).getOne(id);
      return record;
    } catch (error) {
      if (error.status === 404) return null;
      throw new Error(`PocketBase findById failed: ${error.message}`);
    }
  }

  async findAll(filter = {}) {
    try {
      // Build PocketBase filter string
      const filterString = this.buildFilterString(filter);
      const records = await this.client.collection(this.collectionName).getList(
        filter.page || 1,
        filter.perPage || 50,
        {
          filter: filterString,
          sort: filter.sort || '-created',
          expand: filter.expand || '',
        }
      );
      return records;
    } catch (error) {
      throw new Error(`PocketBase findAll failed: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      const record = await this.client.collection(this.collectionName).update(id, {
        ...data,
        updated: new Date().toISOString(),
      });
      return record;
    } catch (error) {
      throw new Error(`PocketBase update failed: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      await this.client.collection(this.collectionName).delete(id);
      return true;
    } catch (error) {
      throw new Error(`PocketBase delete failed: ${error.message}`);
    }
  }

  async findOne(filter) {
    try {
      const result = await this.client.collection(this.collectionName).getList(1, 1, {
        filter: this.buildFilterString(filter),
      });
      return result.items[0] || null;
    } catch (error) {
      throw new Error(`PocketBase findOne failed: ${error.message}`);
    }
  }

  // Helper to convert filter object to PocketBase filter string
  buildFilterString(filter) {
    if (!filter || Object.keys(filter).length === 0) return '';
    
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'page' || key === 'perPage' || key === 'sort' || key === 'expand') continue;
      
      if (typeof value === 'string') {
        conditions.push(`${key} = "${value}"`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        conditions.push(`${key} = ${value}`);
      } else if (Array.isArray(value)) {
        // For array filters (e.g., category in ['a', 'b'])
        const values = value.map(v => `"${v}"`).join(',');
        conditions.push(`${key} in (${values})`);
      } else if (value && typeof value === 'object') {
        // Range filters (e.g., price > 100)
        if (value.gt) conditions.push(`${key} > ${value.gt}`);
        if (value.gte) conditions.push(`${key} >= ${value.gte}`);
        if (value.lt) conditions.push(`${key} < ${value.lt}`);
        if (value.lte) conditions.push(`${key} <= ${value.lte}`);
        if (value.ne) conditions.push(`${key} != ${value.ne}`);
      }
    }
    return conditions.join(' && ');
  }
}

module.exports = PocketBaseRepository;