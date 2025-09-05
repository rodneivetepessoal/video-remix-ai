const nextConfig = {
    env: {
        MONGODB_URI: process.env.MONGODB_URI,
        REDIS_URL: process.env.REDIS_URL,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
        PEXELS_API_KEY: process.env.PEXELS_API_KEY,
        SHOTSTACK_API_KEY: process.env.SHOTSTACK_API_KEY,
    },
    /* config options here */
};
export default nextConfig;
