import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponce } from "../utils/ApiResponce.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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

const changePassword = asyncHandler(async (req, res) => {
    const { oldpassword, newpassword } = req.body;

    // 1. Check required fields
    if (!oldpassword || !newpassword) {
        throw new ApiError(400, "All fields are required");
    }

    // 2. Fetch the user
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // 3. Compare old password
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }

    // 4. Set new password (hashing is usually handled in pre-save hook)
    user.password = newpassword;

    // 5. Save user (validateBeforeSave false is fine if hooks are working)
    await user.save({ validateBeforeSave: false });

    // 6. Return response
    return res.status(200).json(
        new ApiResponce(200, null, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res.status(200).json(req.user || new ApiResponce(404, null, "User not found"));
})

const getUserCHannelProfile = asyncHandler(async (req, res)=>{
    const {username} = req.params;
    if(!username?.trim())
    {
        throw new ApiError(400,"username is missing");
    }
    const channel = await User.aggregate([
        { $match: { username: username.toLowerCase() } },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"] // Check if the current user is in the subscribers list
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                email: 1,
            }
        }
    ])

    console.log(channel); // it ruturns an array, even if there's one user
    if(!channel?.length)
    {
        throw new ApiError(404,"Channel does not exist");
    }

    return res.status(200).json(
        new ApiResponce(200, channel[0], "Channel profile fetched successfully")
    );
})

const getWatchHistory = asyncHandler(async (req, res) =>{
    const user = await User.aggregate([
        { 
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $arrayElemAt: ["$owner", 0] } // Get the first element of the owner array
                        }
                    }
                ]
            }
        },
        {
            $project: {
                watchHistory: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponce(200, user[0]?.watchHistory || [], "Watch history fetched successfully")
    )
})

export { registerUser, loginuser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, getUserCHannelProfile, getWatchHistory }; 