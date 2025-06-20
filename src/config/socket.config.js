let ioInstance = null;

module.exports = {
    setIo: (io) => {
        ioInstance = io;
    },
    getIo: () => {
        if (!ioInstance) {
            throw new Error('Socket.IO instance not initialized');
        }
        return ioInstance;
    }
};