const { User, Task } = require('../models/user');

module.exports = function (router) {

    router.get('/', (req, res) => {
        res.json({ message: 'Server is running', data: null });
    });

    router.get('/users', async (req, res) => {
        try {
            let query = User.find(JSON.parse(req.query.where || '{}'));
            if (req.query.sort) query.sort(JSON.parse(req.query.sort));
            if (req.query.select) query.select(JSON.parse(req.query.select));
            if (req.query.skip) query.skip(parseInt(req.query.skip));
            if (req.query.limit) query.limit(parseInt(req.query.limit));
            if (req.query.count === 'true') {
                const count = await User.countDocuments(JSON.parse(req.query.where || '{}'));
                return res.json({ message: "OK", data: { count } });
            }
            const users = await query.exec();
            res.json({ message: "OK", data: users });
        } catch (err) {
            res.status(400).json({ message: "Bad request", data: { error: err.message } });
        }
    });

    router.post('/users', async (req, res) => {
        try {
            if (!req.body.name || !req.body.email) {
                return res.status(400).json({ message: "Bad request", data: { error: "Name and email are required" } });
            }
            const existing = await User.findOne({ email: req.body.email });
            if (existing) {
                return res.status(400).json({ message: "Bad request", data: { error: "Email already exists" } });
            }
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                pendingTasks: [],
                dateCreated: new Date()
            });
            await user.save();
            res.status(201).json({ message: "User created", data: user });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: { error: err.message } });
        }
    });

    router.get('/users/:id', async (req, res) => {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found", data: null });
        res.json({ message: "OK", data: user });
    });

    router.put('/users/:id', async (req, res) => {
        try {
            if (req.body.email) {
                const existing = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } });
                if (existing) {
                    return res.status(400).json({ message: "Bad request", data: { error: "Email already exists" } });
                }
            }
            const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
            if (!user) return res.status(404).json({ message: "User not found", data: null });
            res.json({ message: "User updated", data: user });
        } catch (err) {
            res.status(400).json({ message: "Bad request", data: { error: err.message } });
        }
    });

    router.delete('/users/:id', async (req, res) => {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found", data: null });
        await Task.updateMany({ assignedUser: user._id }, { $set: { assignedUser: null, assignedUserName: "unassigned" } });
        await User.findByIdAndDelete(req.params.id);
        res.status(204).json({ message: "User deleted", data: null });
    });

    router.get('/tasks', async (req, res) => {
        try {
            let query = Task.find(JSON.parse(req.query.where || '{}'));
            if (req.query.sort) query.sort(JSON.parse(req.query.sort));
            if (req.query.select) query.select(JSON.parse(req.query.select));
            if (req.query.skip) query.skip(parseInt(req.query.skip));
            if (req.query.limit) query.limit(parseInt(req.query.limit));
            else query.limit(100);
            if (req.query.count === 'true') {
                const count = await Task.countDocuments(JSON.parse(req.query.where || '{}'));
                return res.json({ message: "OK", data: { count } });
            }
            const tasks = await query.exec();
            res.json({ message: "OK", data: tasks });
        } catch (err) {
            res.status(400).json({ message: "Bad request", data: { error: err.message } });
        }
    });

    router.post('/tasks', async (req, res) => {
        try {
            if (!req.body.name || !req.body.deadline) {
                return res.status(400).json({ message: "Bad request", data: { error: "Name and deadline are required" } });
            }
            const task = new Task({
                name: req.body.name,
                description: req.body.description || "",
                deadline: req.body.deadline,
                completed: req.body.completed || false,
                assignedUser: req.body.assignedUser || null,
                assignedUserName: req.body.assignedUserName || "unassigned",
                dateCreated: new Date()
            });
            if (task.assignedUser) {
                const user = await User.findById(task.assignedUser);
                if (user) {
                    task.assignedUserName = user.name; // Set the name
                    await user.updateOne({ $push: { pendingTasks: task._id } });
                }
            }
            await task.save();
            res.status(201).json({ message: "Task created", data: task });
        } catch (err) {
            res.status(400).json({ message: "Bad request", data: { error: err.message } });
        }
    });

    router.get('/tasks/:id', async (req, res) => {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found", data: null });
        res.json({ message: "OK", data: task });
    });

    router.put('/tasks/:id', async (req, res) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) return res.status(404).json({ message: "Task not found", data: null });
            if (req.body.assignedUser && task.assignedUser && task.assignedUser.toString() !== req.body.assignedUser) {
                await User.findByIdAndUpdate(task.assignedUser, { $pull: { pendingTasks: task._id } });
            }
            Object.assign(task, req.body);
            await task.save();
            if (task.assignedUser) {
                await User.findByIdAndUpdate(task.assignedUser, { $addToSet: { pendingTasks: task._id } });
            }
            res.json({ message: "Task updated", data: task });
        } catch (err) {
            res.status(400).json({ message: "Bad request", data: { error: err.message } });
        }
    });

    router.delete('/tasks/:id', async (req, res) => {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found", data: null });
        if (task.assignedUser) {
            await User.findByIdAndUpdate(task.assignedUser, { $pull: { pendingTasks: task._id } });
        }
        await Task.findByIdAndDelete(req.params.id);
        res.status(204).json({ message: "Task deleted", data: null });
    });

    return router;
};
