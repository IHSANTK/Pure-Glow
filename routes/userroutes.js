const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');
const passport = require('passport');
const upload = require('../config/multer');
const preventBack = require("../middlewears/preventback");

// Include the passport initialization
router.use(passport.initialize());

// Routes
router.get('/', userController.Homepage);
router.get('/profile', userController.userprofilepage);
router.get('/login',preventBack, userController.loginpage);
router.get('/block',preventBack,userController.blockpage)
router.post('/login',preventBack, userController.dataslogin);
router.get('/signup',preventBack, userController.signuppage);
router.post('/signup',preventBack, userController.getsignupdata);
router.get('/logout',preventBack, userController.logout);
// router.get('/change-password/:id',preventBack,userController.changepassword)
// router.get('/edit-profile/:id',preventBack,userController.editprofileget)
router.post('/edit-profile/:id',upload.array('profileImage', 1),userController.editprofile)
router.post('/edit-password/:id',userController.editpassword)
router.get('/shop',preventBack,userController.shoppage)
router.get('/getshopproduct/:category',preventBack,userController.getproductdetails)
router.post('/cart/:id',preventBack, userController.addToCart);
router.get('/cart',preventBack, userController.cartpage);
router.post('/deletecartproduct/:productId',preventBack, userController.deletecartproduct);
// router.get('/latestproduct', userController.latestproduct);

router.post('/latestproduct', userController.latestproduct);

router.get('/whishlist',userController.whishlistget);

router.post('/wishlist/:id', userController.wishlist);

router.get('/productveiw/:id',userController.productveiw);

router.get('/checkout',preventBack,userController.checkoutpage);

router.get('/auth/google', userController.googleAuth);

router.get('/auth/google/callback',
 passport.authenticate('google',{successRedirect: '/', failureRedirect:'/failure'})
);

router.get('/success', userController.succesGoogleLogin);
router.get('/failure', userController.failureGooglelogin);

module.exports = router;