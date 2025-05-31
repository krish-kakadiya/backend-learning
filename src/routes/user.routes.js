import { Router } from 'express';
import { loginuser, logoutUser, registerUser, refreshAccessToken, changePassword, getCurrentUser, watchHistory, getUserCHannelProfile} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { get } from 'mongoose';

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(loginuser)

// secured routes
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").put(verifyJWT,changePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/c/:username").get(verifyJWT, getUserCHannelProfile);
router.route("/watch-history").get(verifyJWT, watchHistory);
export default router;