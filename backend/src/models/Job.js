import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Please add a job title'],
        trim: true 
    },
    category: { 
        type: String, 
        required: [true, 'Category is required for AI matching'],
        index: true // Helps the Cron Job find matches faster
    },
    description: { type: String },
    location: {
        address: { type: String, required: true }, // e.g., "Bole, near Edna Mall"
        type: { 
            type: String, 
            enum: ['Point'], 
            default: 'Point' 
        },
        coordinates: { 
            type: [Number], // [longitude, latitude]
            required: true 
        }
    },
    employer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    worker: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    salary: { 
        type: Number, 
        required: [true, 'Please add a salary amount'] 
    },
    status: { 
        type: String, 
        enum: ['open', 'in-progress', 'completed', 'cancelled'], 
        default: 'open' 
    },
    voiceMemoUrl: { type: String }, // For the Employer's spoken description
    isAiFlagged: { type: Boolean, default: false } // For fake job detection
}, { 
    timestamps: true 
});

// CRITICAL for Map Integration: This enables distance-based searching
jobSchema.index({ location: "2dsphere" });

// Compound index for high-throughput job searches by location and category
jobSchema.index({ "location.coordinates": "2dsphere", category: 1, status: 1 });

// Index for salary range queries
jobSchema.index({ salary: 1 });

// Index for employer lookups
jobSchema.index({ employer: 1, status: 1 });

// Use export default for ESM
export default mongoose.model('Job', jobSchema);