import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponce } from "../utils/ApiResponce.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";
import { jwt } from 'jsonwebtoken';

const generateAccessAndRefreshToken = async(userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken};
    }
    catch(error){
        throw new ApiError(500,"something went wrong while creating tokens");
    }
}

const registerUser = asyncHandler(async (req, res)=>{
  
    const {fullname, email, username, password} = req.body
    
    if(
        [fullname,email,username,password].some((field) => field.trim() === "")
    ){
        throw new ApiError(400,"All field are required");
    }

    const existedUser =  await User.findOne({
        $or: [{username},{email}]
    })
    
    if(existedUser)
    {
        throw new ApiError(409,"user with email or username already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required");
    }

    const avatar = await uploadOncloudinary(avatarLocalPath)
    const cover = await uploadOncloudinary(coverImageLocalPath)

    if (!avatar)
    {
        throw new ApiError(400,"avatar file is require")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage : cover?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const created = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!created) {
        throw new ApiError(500,"something went wrong while regestring user");
    }

    return res.status(201).json(
        new ApiResponce(200,created,"user registerd successfully ")
    )

})

const loginuser = asyncHandler(async (req, res) => {
   
    const {username , email , password} = req.body;
    if(!username && !email)
    {
        throw new ApiError(400,"username or email is required");
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user)
    {
        throw new ApiError(404,"User does not exist")
    }

    const flag = await user.isPasswordCorrect(password);

    if(!flag)
    {
        throw new ApiError(401,"password is incorrect");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggeduser = await User.findById(user._id).select("-refreshToken -password");

    const Options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken",accessToken,Options)
        .cookie("refreshToken",refreshToken,Options)
        .json(
        new ApiResponce(200,{
            user: loggeduser,
             accessToken,
             refreshToken
        },"user logged in successfully")
    )

})



const logoutUser = asyncHandler(async (req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true,
            runValidators: true
        }
    )
    const Options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", Options)
        .clearCookie("refreshToken", Options)
        .json(new ApiResponce(200, null, "user logged out successfully"));
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decoded?._id);
    if(!user)
    {
        throw new ApiError(401,"invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken)
    {
        throw new ApiError(401, "Refresh token is expired or used")
    }

    const Options = {
        httpOnly : true,
        secure : true 
    }

    const {accessToken , newrefreshToken } = await generateAccessAndRefreshToken(user._id)

    return res
    .status(200)
    .cookie("accessToken",accessToken,Options)
    .cookie("refreshToken",newrefreshToken,Options)
    .json(new ApiResponce(200,
        {accessToken,refreshToken:newrefreshToken},
    "Access token refreshed"))
})
export { registerUser, loginuser, logoutUser, refreshAccessToken };