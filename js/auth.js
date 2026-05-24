/**
 * Authentication System - ArtGallery
 * Manages user registration, login, and authentication
 */

class AuthManager {
    constructor() {
        this.currentUser = this.loadUser();
        this.currentAdmin = this.loadAdmin();
    }

    /**
     * Register a new user
     * @param {string} email
     * @param {string} password
     * @param {string} fullName
     * @returns {object} {success: boolean, message: string}
     */
    registerUser(email, password, fullName) {
        // Validation
        if (!this.validateEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }
        if (password.length < 6) {
            return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
        }
        if (!fullName.trim()) {
            return { success: false, message: 'Tên không được để trống' };
        }

        // Check if user exists
        const users = this.getAllUsers();
        if (users.some(u => u.email === email)) {
            return { success: false, message: 'Email này đã được đăng ký' };
        }

        // Create new user
        const newUser = {
            id: 'user_' + Date.now(),
            email: email,
            password: this.hashPassword(password),
            fullName: fullName,
            createdAt: new Date().toISOString(),
            role: 'user'
        };

        users.push(newUser);
        localStorage.setItem('artgallery_users', JSON.stringify(users));

        return { success: true, message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' };
    }

    /**
     * Login user
     * @param {string} email
     * @param {string} password
     * @returns {object} {success: boolean, message: string, user?: object}
     */
    loginUser(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
        }

        // Save session
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
     * @param {string} username
     * @param {string} password
     * @returns {object} {success: boolean, message: string, admin?: object}
     */
    loginAdmin(username, password) {
        // Default admin credentials (in production, use proper backend)
        const adminCredentials = {
            username: 'admin',
            password: this.hashPassword('admin123'),
            fullName: 'Administrator'
        };

        if (username !== 'admin' || !this.verifyPassword(password, adminCredentials.password)) {
            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
        }

        // Save admin session
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
     * Logout current admin
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

    /**
     * Load user from localStorage
     */
    loadUser() {
        const userJson = localStorage.getItem('artgallery_current_user');
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Load admin from localStorage
     */
    loadAdmin() {
        const adminJson = localStorage.getItem('artgallery_admin_session');
        return adminJson ? JSON.parse(adminJson) : null;
    }

    /**
     * Get all users from localStorage
     */
    getAllUsers() {
        const usersJson = localStorage.getItem('artgallery_users');
        return usersJson ? JSON.parse(usersJson) : [];
    }

    /**
     * Simple password hashing (for demo - use bcrypt in production)
     */
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(36);
    }

    /**
     * Verify password
     */
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Initialize default admin if not exists
     */
    initializeDefaultAdmin() {
        const defaultAdmin = {
            username: 'admin',
            password: this.hashPassword('admin123'),
            fullName: 'Administrator'
        };
        localStorage.setItem('artgallery_admin_creds', JSON.stringify(defaultAdmin));
    }
}

// Initialize auth manager
const auth = new AuthManager();
auth.initializeDefaultAdmin();
