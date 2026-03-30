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

// เพิ่มฟังก์ชันนี้ต่อท้ายไฟล์ controllers/mapsController.js
exports.getPlaceDetails = async (req, res) => {
  const { place_id } = req.params;
  
  try {
    const response = await client.placeDetails({
      params: {
        place_id: place_id,
        language: 'th',
        // เลือกดึงเฉพาะข้อมูลที่จำเป็นเพื่อประหยัดเงิน (รีวิว, รูปภาพ, เบอร์โทร, เวลาเปิดปิด)
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'rating', 'user_ratings_total', 'reviews', 'photos', 'url', 'geometry'],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 3000,
    });

    const placeDetails = response.data.result;

    // แนบ URL สำหรับดึงรูปภาพไปด้วย เพื่อให้ Frontend นำไปแสดงผลได้ทันที
    if (placeDetails && placeDetails.photos) {
      placeDetails.photos = placeDetails.photos.map(photo => ({
        ...photo,
        photo_url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      }));
    }

    res.status(200).json(placeDetails);
  } catch (error) {
    console.error("Place Details Error:", error);
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลรายละเอียดได้" });
  }
};
