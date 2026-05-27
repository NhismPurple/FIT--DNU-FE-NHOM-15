/**
 * auth.js — Hệ thống xác thực người dùng & quản trị viên
 * Xử lý: đăng ký, đăng nhập, đăng xuất, quản lý phiên (session)
 * Lưu trữ dữ liệu trong localStorage (phù hợp demo, production cần backend)
 */

class AuthManager {
    constructor() {
        // Khi khởi tạo, đọc phiên đã lưu từ localStorage (nếu có)
        // → Giúp người dùng không bị đăng xuất khi tải lại trang
        this.currentUser  = this.loadUser();
        this.currentAdmin = this.loadAdmin();

        // Thời gian hết hạn phiên: 24 giờ (ms)
        this.sessionTimeout = 24 * 60 * 60 * 1000;

        // Theo dõi số lần đăng nhập sai để chống brute-force
        this.loginAttempts    = {};        // { identifier: { count, lastAttempt } }
        this.maxLoginAttempts = 5;         // Tối đa 5 lần sai
        this.lockoutDuration  = 15 * 60 * 1000; // Khóa 15 phút nếu vượt quá
    }

    // ─── VALIDATION ──────────────────────────────────────────

    /**
     * Kiểm tra định dạng email hợp lệ (phải có @ và domain)
     * @param {string} email
     * @returns {boolean}
     */
    validateEmail(email) {
        // Regex kiểm tra: có ký tự trước @, có domain, có phần mở rộng (.com, .vn...)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Kiểm tra mật khẩu đủ độ dài tối thiểu
     * @param {string} password
     * @returns {{ valid: boolean, message: string }}
     */
    validatePassword(password) {
        if (password.length < 6) {
            return { valid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
        }
        return { valid: true, message: 'Mật khẩu hợp lệ' };
    }

    // ─── HASH MẬT KHẨU ───────────────────────────────────────

    /**
     * Hàm hash đơn giản (thuật toán djb2 biến thể)
     * ⚠️ Chỉ dùng cho demo — production phải dùng bcrypt hoặc Argon2
     * @param {string} password - Mật khẩu gốc
     * @returns {string} Chuỗi hash số nguyên
     */
    hashPassword(password) {
        let hash = 0;
        if (password.length === 0) return hash.toString();
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i); // Lấy mã ASCII của từng ký tự
            hash = ((hash << 5) - hash) + char;  // hash * 31 + char
            hash = hash & hash;                   // Ép về 32-bit integer
        }
        return hash.toString();
    }

    /**
     * So sánh mật khẩu gốc với hash đã lưu
     * @param {string} password - Mật khẩu người dùng nhập
     * @param {string} hash     - Hash đã lưu trong localStorage
     * @returns {boolean}
     */
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    // ─── CHỐNG BRUTE-FORCE ────────────────────────────────────

    /**
     * Kiểm tra xem tài khoản có đang bị khóa (quá nhiều lần sai) không
     * @param {string} identifier - Email hoặc username dùng để theo dõi
     * @returns {{ allowed: boolean, message: string }}
     */
    checkLoginAttempts(identifier) {
        const now      = Date.now();
        const attempts = this.loginAttempts[identifier] || { count: 0, lastAttempt: 0 };

        // Nếu đã qua thời gian khóa, reset bộ đếm và cho phép thử lại
        if (now - attempts.lastAttempt > this.lockoutDuration) {
            this.loginAttempts[identifier] = { count: 0, lastAttempt: now };
            return { allowed: true, message: '' };
        }

        // Nếu số lần sai đã đạt tối đa → tính thời gian còn lại và từ chối
        if (attempts.count >= this.maxLoginAttempts) {
            const remainingTime = Math.ceil(
                (this.lockoutDuration - (now - attempts.lastAttempt)) / 60000
            );
            return {
                allowed: false,
                message: `Quá nhiều lần thử. Vui lòng thử lại sau ${remainingTime} phút`
            };
        }

        return { allowed: true, message: '' };
    }

    /**
     * Ghi nhận một lần đăng nhập thất bại
     * @param {string} identifier - Email hoặc username
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
     * Xóa bộ đếm thất bại sau khi đăng nhập thành công
     * @param {string} identifier
     */
    clearLoginAttempts(identifier) {
        delete this.loginAttempts[identifier];
    }

    // ─── ĐĂNG KÝ / ĐĂNG NHẬP NGƯỜI DÙNG ─────────────────────

    /**
     * Đăng ký tài khoản người dùng mới
     * @param {string} email    - Email (dùng làm tên đăng nhập)
     * @param {string} password - Mật khẩu gốc
     * @param {string} fullName - Họ tên đầy đủ
     * @returns {{ success: boolean, message: string }}
     */
    registerUser(email, password, fullName) {
        // 1. Kiểm tra không bỏ trống
        if (!email || !password || !fullName) {
            return { success: false, message: 'Vui lòng điền đầy đủ thông tin' };
        }

        // 2. Kiểm tra định dạng email
        if (!this.validateEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }

        // 3. Kiểm tra độ mạnh mật khẩu
        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.valid) {
            return { success: false, message: passwordValidation.message };
        }

        // 4. Kiểm tra email chưa được đăng ký trước đó
        const allUsers = this.getAllUsers();
        if (allUsers.some(user => user.email === email)) {
            return { success: false, message: 'Email này đã được đăng ký' };
        }

        // 5. Tạo object người dùng mới với mật khẩu đã hash
        const newUser = {
            id:           'user_' + Date.now(), // ID duy nhất dựa trên timestamp
            email:        email,
            password:     this.hashPassword(password), // Không lưu mật khẩu thô
            fullName:     fullName,
            registeredAt: new Date().toISOString(),
            lastLogin:    null
        };

        // 6. Lưu vào danh sách users trong localStorage
        allUsers.push(newUser);
        localStorage.setItem('artgallery_users', JSON.stringify(allUsers));

        return { success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập' };
    }

    /**
     * Đăng nhập người dùng thông thường
     * @param {string} email    - Email đã đăng ký
     * @param {string} password - Mật khẩu gốc
     * @returns {{ success: boolean, message: string, user?: Object }}
     */
    loginUser(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Vui lòng điền email và mật khẩu' };
        }

        // Kiểm tra tài khoản có đang bị khóa không
        const attemptCheck = this.checkLoginAttempts(email);
        if (!attemptCheck.allowed) {
            return { success: false, message: attemptCheck.message };
        }

        // Tìm user theo email trong danh sách
        const allUsers = this.getAllUsers();
        const user     = allUsers.find(u => u.email === email);

        // Email không tồn tại → ghi nhận lần thất bại
        if (!user) {
            this.recordFailedAttempt(email);
            return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
        }

        // Mật khẩu sai → ghi nhận lần thất bại
        if (!this.verifyPassword(password, user.password)) {
            this.recordFailedAttempt(email);
            return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
        }

        // Đăng nhập thành công → xóa bộ đếm thất bại
        this.clearLoginAttempts(email);

        // Cập nhật thời điểm đăng nhập cuối vào localStorage
        user.lastLogin = new Date().toISOString();
        const userIndex = allUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            allUsers[userIndex] = user;
            localStorage.setItem('artgallery_users', JSON.stringify(allUsers));
        }

        // Tạo object phiên đăng nhập (chỉ lưu thông tin cần thiết, không lưu mật khẩu)
        const userSession = {
            id:        user.id,
            email:     user.email,
            fullName:  user.fullName,
            role:      'user',
            loginTime: new Date().toISOString()
        };

        // Lưu phiên vào localStorage để giữ trạng thái sau khi tải lại trang
        localStorage.setItem('artgallery_current_user', JSON.stringify(userSession));
        this.currentUser = userSession;

        return { success: true, message: 'Đăng nhập thành công!', user: userSession };
    }

    // ─── ĐĂNG NHẬP ADMIN ─────────────────────────────────────

    /**
     * Đăng nhập quản trị viên bằng username/password cố định
     * @param {string} username - Tên đăng nhập admin
     * @param {string} password - Mật khẩu admin
     * @returns {{ success: boolean, message: string, admin?: Object }}
     */
    loginAdmin(username, password) {
        if (!username || !password) {
            return { success: false, message: 'Vui lòng điền tên đăng nhập và mật khẩu' };
        }

        // Kiểm tra tài khoản admin có đang bị khóa không
        // Dùng prefix 'admin_' để tách biệt với user thường trong loginAttempts
        const attemptCheck = this.checkLoginAttempts('admin_' + username);
        if (!attemptCheck.allowed) {
            return { success: false, message: attemptCheck.message };
        }

        // Thông tin đăng nhập admin mặc định (hardcode cho demo)
        // ⚠️ Production: lưu trong biến môi trường server-side
        const adminCredentials = {
            username: 'admin',
            password: this.hashPassword('admin123'), // Hash sẵn để so sánh
            fullName: 'Administrator'
        };

        // So sánh username VÀ mật khẩu — cả hai đều phải đúng
        if (username !== 'admin' || !this.verifyPassword(password, adminCredentials.password)) {
            this.recordFailedAttempt('admin_' + username);
            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
        }

        // Đăng nhập thành công
        this.clearLoginAttempts('admin_' + username);

        // Tạo phiên admin
        const adminSession = {
            id:        'admin_001',
            username:  username,
            fullName:  adminCredentials.fullName,
            role:      'admin',
            loginTime: new Date().toISOString()
        };

        // Lưu phiên admin vào localStorage (key riêng, tách biệt với user)
        localStorage.setItem('artgallery_admin_session', JSON.stringify(adminSession));
        this.currentAdmin = adminSession;

        return { success: true, message: 'Đăng nhập thành công!', admin: adminSession };
    }

    // ─── ĐĂNG XUẤT ───────────────────────────────────────────

    /** Đăng xuất người dùng: xóa phiên khỏi localStorage và bộ nhớ */
    logoutUser() {
        localStorage.removeItem('artgallery_current_user');
        this.currentUser = null;
    }

    /** Đăng xuất admin: xóa phiên admin khỏi localStorage và bộ nhớ */
    logoutAdmin() {
        localStorage.removeItem('artgallery_admin_session');
        this.currentAdmin = null;
    }

    // ─── KIỂM TRA TRẠNG THÁI ─────────────────────────────────

    /** @returns {boolean} true nếu người dùng đang đăng nhập */
    isUserLoggedIn() {
        return this.currentUser !== null;
    }

    /** @returns {boolean} true nếu admin đang đăng nhập */
    isAdminLoggedIn() {
        return this.currentAdmin !== null;
    }

    // ─── ĐỌC DỮ LIỆU ─────────────────────────────────────────

    /**
     * Lấy toàn bộ danh sách người dùng từ localStorage
     * @returns {Array} Mảng các object user
     */
    getAllUsers() {
        const users = localStorage.getItem('artgallery_users');
        // Nếu chưa có dữ liệu (lần đầu dùng app), trả về mảng rỗng
        return users ? JSON.parse(users) : [];
    }

    /**
     * Đọc phiên người dùng đã lưu từ localStorage
     * Gọi lúc khởi tạo AuthManager để khôi phục trạng thái đăng nhập
     * @returns {Object|null}
     */
    loadUser() {
        const userSession = localStorage.getItem('artgallery_current_user');
        return userSession ? JSON.parse(userSession) : null;
    }

    /**
     * Đọc phiên admin đã lưu từ localStorage
     * @returns {Object|null}
     */
    loadAdmin() {
        const adminSession = localStorage.getItem('artgallery_admin_session');
        return adminSession ? JSON.parse(adminSession) : null;
    }

    /** @returns {Object|null} Thông tin người dùng hiện tại */
    getCurrentUser()  { return this.currentUser;  }

    /** @returns {Object|null} Thông tin admin hiện tại */
    getCurrentAdmin() { return this.currentAdmin; }
}

// Tạo một instance duy nhất và gán vào biến global
// → Các file HTML và JS khác dùng chung object 'auth' này
const auth = new AuthManager();