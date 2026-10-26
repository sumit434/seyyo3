import mongoose from 'mongoose';

/**
 * Non-blocking MongoDB connection initializer with pure in-memory fallback.
 * Disables command buffering to fail fast if disconnected.
 */
export async function connectMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.info('[MongoDB] No MONGODB_URI provided. Running in pure in-memory mode.');
    return false;
  }

  // Enforce zero command buffering to prevent query queues if disconnected
  mongoose.set('bufferCommands', false);

  try {
    console.info('[MongoDB] Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.info('[MongoDB] Connected successfully.');
    return true;
  } catch (err: any) {
    console.warn('[MongoDB] Connection failed, falling back to RAM (MemoryDB):', err?.message || err);
    return false;
  }
}
