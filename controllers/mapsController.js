const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

// ฟังก์ชันคำนวณระยะทาง (Haversine Formula) เป็นเส้นตรง กิโลเมตร
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // รัศมีโลกในหน่วยกิโลเมตร
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

exports.searchNearbyPlaces = async (req, res) => {
  // รับคำค้นหาจากหน้าเว็บ (เช่น "สปา ใกล้ฉัน") และพิกัดของผู้ใช้
  const { keyword, lat, lng } = req.query; 

  try {
    // 1. ค้นหาในระยะ 5000 เมตร (5 กิโลเมตร) ก่อน
    let response = await client.textSearch({
      params: {
        query: keyword,
        location: lat && lng ? `${lat},${lng}` : undefined,
        radius: 5000, 
        language: 'th', 
        key: process.env.GOOGLE_MAPS_API_KEY, 
      },
      timeout: 2000,
    });

    let results = response.data.results;

    // 2. ถ้าในระยะ 5000m ไม่เจอเลย ให้ลองขยายรัศมีเป็น 50000m (50 กิโลเมตร)
    if (results.length === 0 && lat && lng) {
      response = await client.textSearch({
        params: {
          query: keyword,
          location: `${lat},${lng}`,
          radius: 50000, 
          language: 'th', 
          key: process.env.GOOGLE_MAPS_API_KEY, 
        },
        timeout: 2000,
      });
      results = response.data.results;
    }

    // 3. ถ้ามีพิกัด user ให้ทำการคำนวณระยะทางและเรียงลำดับจากใกล้ไปไกล
    if (lat && lng && results.length > 0) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      results = results.map(place => {
        // หาพิกัดสถานที่
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        
        let distance = 0;
        if (placeLat && placeLng) {
          distance = getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng);
        }
        
        // เพิ่มค่า distance_km ไปใน object
        return {
          ...place,
          distance_km: distance
        };
      });

      // เรียงลำดับจากค่าน้อย (ใกล้สุด) ไปค่ามาก (ไกลสุด)
      results.sort((a, b) => a.distance_km - b.distance_km);
    }

    // ส่งข้อมูลสถานที่ที่ผ่านการเรียงลำดับกลับไปให้หน้า React
    res.status(200).json(results);
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
