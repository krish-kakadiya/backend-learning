import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponce } from "../utils/ApiResponce.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";

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

export { registerUser };