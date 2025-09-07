const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

/**
 * 每月統計：熱區 + 活躍人數
 * 執行時間：每月 1 號凌晨 1 點（布里斯本時間）
 */
// eslint-disable-next-line max-len
exports.aggregateMonthlyLocationStats = functions
    .region("australia-southeast1") 
    .pubsub
    .schedule("1 of month 01:00")
    .timeZone("Australia/Brisbane")
    .onRun(async (context) => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const lastMonth = now.getMonth(); // 上個月 (0-based)

        const start = new Date(year, lastMonth - 1, 1);
        const end = new Date(year, lastMonth, 0, 23, 59, 59);

        const snapshot = await db.collectionGroup("history")
            .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(start))
            .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(end))
            .get();

        const heatmap = {};
        const activeUserSet = new Set();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const {latitude, longitude} = data;
          if (latitude == null || longitude == null) return;

          const lat = Math.round(latitude * 1000) / 1000;
          const lng = Math.round(longitude * 1000) / 1000;
          const key = `lat_${lat}_lng_${lng}`;
          heatmap[key] = (heatmap[key] || 0) + 1;

          // 取得 userId
          const segments = doc.ref.path.split("/");
          const userId = segments[segments.indexOf("locations") + 1];
          if (userId) activeUserSet.add(userId);
        });

        // eslint-disable-next-line max-len
        const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

        const result = {
          month: monthKey,
          generatedAt: admin.firestore.Timestamp.now(),
          heatmap: heatmap,
          activeUsers: activeUserSet.size,
        };

        // eslint-disable-next-line max-len
        await db.collection("analytics").doc(`location-monthly-${monthKey}`).set(result);


        console.log(`Monthly stats saved: location-monthly-${monthKey}`);
      } catch (error) {
        console.error(" Error during monthly aggregation:", error);
      }
    });
