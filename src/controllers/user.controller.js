import { asyncHandler } from '../utils/asyncHandler.js';


const registerUser = asyncHandler(async (req, res)=>{
    //step for user registration
    //1. get user data from request body
    //2. validate user data
    //3. check if user already exists
    // Here you would typically check the database to see if the user already exists
    // For demonstration, let's assume the user does not exist
    //4. create new user
    //5. save user to database
    // Here you would typically save the user to the database
    // For demonstration, let's assume the user is saved successfully
    //6. send response
    const {fullname, email, username, password} = req.body
    console.log(email)
    res.status(201).json({
        message: 'User registered successfully',
    });
})

export { registerUser };