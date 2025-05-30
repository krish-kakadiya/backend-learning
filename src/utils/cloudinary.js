import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET_KEY // Click 'View API Keys' above to copy your API secret
});


const uploadOncloudinary = async (filepath) => {
    try {
        if(!filepath) return null;
        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(filepath, {
            resource_type: 'auto', // Automatically detect the resource type
        });
        console.log('File uploaded successfully:', result);
        fs.unlinkSync(filepath);
        return result; // Return the secure URL of the uploaded file
        
    } catch (error) {
        fs.unlinkSync(filepath); // Ensure the file is removed even if upload fails
        console.error('Error uploading file to Cloudinary:', error);
        return null; // Return null in case of error
    }
}


export { uploadOncloudinary };