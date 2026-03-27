const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

exports.searchNearbyPlaces = async (req, res) => {
  // รับคำค้นหาจากหน้าเว็บ (เช่น "สปา ใกล้ฉัน") และพิกัดของผู้ใช้
  const { keyword, lat, lng } = req.query; 

  try {
    const response = await client.textSearch({
      params: {
        query: keyword,
        location: lat && lng ? `${lat},${lng}` : undefined,
        radius: 5000, // รัศมี 5 กิโลเมตร
        language: 'th', // ขอผลลัพธ์เป็นภาษาไทย
        key: process.env.GOOGLE_MAPS_API_KEY, // ดึงคีย์จากไฟล์ .env
      },
      timeout: 2000,
    });

    // ส่งข้อมูลสถานที่ที่ Google หาเจอ กลับไปให้หน้า React
    res.status(200).json(response.data.results);
  } catch (error) {
    console.error("Google Maps API Error:", error.response?.data?.error_message || error.message);
    res.status(500).json({ message: "ไม่สามารถเชื่อมต่อ Google Maps ได้" });
  }
};
