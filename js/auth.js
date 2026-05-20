/**
 * ArtGallery Authentication Manager
 * Handles user registration, login, logout, and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = this.loadUser();
        this.currentAdmin = this.loadAdmin();
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.loginAttempts = {};
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     */
    validatePassword(password) {
        if (password.length < 6) {
            return { valid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
        }
        return { valid: true, message: 'Mật khẩu hợp lệ' };
    }

    /**
     * Simple hash function (for demo only - use bcrypt in production)
     */
    hashPassword(password) {
        let hash = 0;
        if (password.length === 0) return hash.toString();
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    /**
     * Verify password against hash
     */
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    /**
     * Check login attempts and lockout
     */
    checkLoginAttempts(identifier) {
        const now = Date.now();
        const attempts = this.loginAttempts[identifier] || { count: 0, lastAttempt: 0 };

        // Reset if lockout period has passed
        if (now - attempts.lastAttempt > this.lockoutDuration) {
            this.loginAttempts[identifier] = { count: 0, lastAttempt: now };
            return { allowed: true, message: '' };
        }

        if (attempts.count >= this.maxLoginAttempts) {
            const remainingTime = Math.ceil((this.lockoutDuration - (now - attempts.lastAttempt)) / 60000);
            return {
                allowed: false,
                message: `Quá nhiều lần thử. Vui lòng thử lại sau ${remainingTime} phút`
            };
        }

        return { allowed: true, message: '' };
    }

    /**
     * Record failed login attempt
     */
    recordFailedAttempt(identifier) {
        const now = Date.now();
        if (!this.loginAttempts[identifier]) {
            this.loginAttempts[identifier] = { count: 0, lastAttempt: now };
        }
        this.loginAttempts[identifier].count++;
        this.loginAttempts[identifier].lastAttempt = now;
    }

    /**
     * Clear login attempts
     */
    clearLoginAttempts(identifier) {
        delete this.loginAttempts[identifier];
    }

    /**
     * Register a new user
     */
    registerUser(email, password, fullName) {
        if (!email || !password || !fullName) {
            return { success: false, message: 'Vui lòng điền đầy đủ thông tin' };
        }

        if (!this.validateEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }

        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.valid) {
            return { success: false, message: passwordValidation.message };
        }

        const allUsers = this.getAllUsers();

        if (allUsers.some(user => user.email === email)) {
            return { success: false, message: 'Email này đã được đăng ký' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            email: email,
            password: this.hashPassword(password),
            fullName: fullName,
            registeredAt: new Date().toISOString(),
            lastLogin: null
        };

        allUsers.push(newUser);
        localStorage.setItem('artgallery_users', JSON.stringify(allUsers));

        return { success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập' };
    }

    /**
     * Login user
     */
    loginUser(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Vui lòng điền email và mật khẩu' };
        }

        // Check login attempts
        const attemptCheck = this.checkLoginAttempts(email);
        if (!attemptCheck.allowed) {
            return { success: false, message: attemptCheck.message };
        }

        const allUsers = this.getAllUsers();
        const user = allUsers.find(u => u.email === email);

        if (!user) {
            this.recordFailedAttempt(email);
            return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
        }

        if (!this.verifyPassword(password, user.password)) {
            this.recordFailedAttempt(email);
            return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
        }

        // Clear login attempts on success
        this.clearLoginAttempts(email);

        // Update last login
        user.lastLogin = new Date().toISOString();
        const userIndex = allUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            allUsers[userIndex] = user;
            localStorage.setItem('artgallery_users', JSON.stringify(allUsers));
        }

        // Create session
        const userSession = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: 'user',
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('artgallery_current_user', JSON.stringify(userSession));
        this.currentUser = userSession;

        return { success: true, message: 'Đăng nhập thành công!', user: userSession };
    }

    /**
     * Login admin
     */
    loginAdmin(username, password) {
        if (!username || !password) {
            return { success: false, message: 'Vui lòng điền tên đăng nhập và mật khẩu' };
        }

        // Check login attempts
        const attemptCheck = this.checkLoginAttempts('admin_' + username);
        if (!attemptCheck.allowed) {
            return { success: false, message: attemptCheck.message };
        }

        // Default admin credentials
        const adminCredentials = {
            username: 'admin',
            password: this.hashPassword('admin123'),
            fullName: 'Administrator'
        };

        if (username !== 'admin' || !this.verifyPassword(password, adminCredentials.password)) {
            this.recordFailedAttempt('admin_' + username);
            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
        }

        // Clear login attempts on success
        this.clearLoginAttempts('admin_' + username);

        // Create admin session
        const adminSession = {
            id: 'admin_001',
            username: username,
            fullName: adminCredentials.fullName,
            role: 'admin',
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('artgallery_admin_session', JSON.stringify(adminSession));
        this.currentAdmin = adminSession;

        return { success: true, message: 'Đăng nhập thành công!', admin: adminSession };
    }

    /**
     * Logout current user
     */
    logoutUser() {
        localStorage.removeItem('artgallery_current_user');
        this.currentUser = null;
    }

    /**
     * Logout admin
     */
    logoutAdmin() {
        localStorage.removeItem('artgallery_admin_session');
        this.currentAdmin = null;
    }

    /**
     * Check if user is logged in
     */
    isUserLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Check if admin is logged in
     */
    isAdminLoggedIn() {
        return this.currentAdmin !== null;
    }

    /**
     * Get all users
     */
    getAllUsers() {
        const users = localStorage.getItem('artgallery_users');
        return users ? JSON.parse(users) : [];
    }

    /**
     * Load user from localStorage
     */
    loadUser() {
        const userSession = localStorage.getItem('artgallery_current_user');
        return userSession ? JSON.parse(userSession) : null;
    }

    /**
     * Load admin from localStorage
     */
    loadAdmin() {
        const adminSession = localStorage.getItem('artgallery_admin_session');
        return adminSession ? JSON.parse(adminSession) : null;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current admin
     */
    getCurrentAdmin() {
        return this.currentAdmin;
    }
}

// Create global auth instance
const auth = new AuthManager();
