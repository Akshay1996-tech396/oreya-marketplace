export const orderColumns = [
  { key: "id", label: "Order ID" },
  { key: "customer", label: "Customer" },
  { key: "vendor", label: "Vendor" },
  { key: "type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
];

export const adminOrders = [
  {
    id: "ORD-1001",
    customer: "Rahul Sharma",
    vendor: "Beautdeluxe Salon",
    type: "Service",
    amount: "₹1,499",
    status: "Delivered",
  },
  {
    id: "ORD-1002",
    customer: "Priya Verma",
    vendor: "Home Cleaning Pro",
    type: "Service",
    amount: "₹899",
    status: "Pending",
  },
  {
    id: "ORD-1003",
    customer: "Amit Jain",
    vendor: "Fashion Store",
    type: "Product",
    amount: "₹2,499",
    status: "Processing",
  },
  {
    id: "ORD-1004",
    customer: "Neha Gupta",
    vendor: "Spa At Home",
    type: "Appointment",
    amount: "₹1,299",
    status: "Confirmed",
  },
];

export const productColumns = [
  { key: "id", label: "Product ID" },
  { key: "name", label: "Product Name" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

export const adminProducts = [
  {
    id: "PRD-101",
    name: "MacBook Pro 13",
    vendor: "Tech Store",
    category: "Laptop",
    price: "₹1,20,000",
    status: "Active",
  },
  {
    id: "PRD-102",
    name: "Apple Watch Ultra",
    vendor: "Gadget Hub",
    category: "Watch",
    price: "₹89,000",
    status: "Active",
  },
  {
    id: "PRD-103",
    name: "iPhone 15 Pro Max",
    vendor: "Mobile World",
    category: "Smartphone",
    price: "₹1,45,000",
    status: "Pending",
  },
];

export const serviceColumns = [
  { key: "id", label: "Service ID" },
  { key: "name", label: "Service Name" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

export const adminServices = [
  {
    id: "SRV-101",
    name: "Full Body Scrub",
    vendor: "Beautdeluxe Salon",
    category: "Beauty",
    price: "₹1,499",
    status: "Active",
  },
  {
    id: "SRV-102",
    name: "Home Cleaning",
    vendor: "Home Cleaning Pro",
    category: "Cleaning",
    price: "₹899",
    status: "Active",
  },
  {
    id: "SRV-103",
    name: "Hair Spa",
    vendor: "Spa At Home",
    category: "Salon",
    price: "₹1,299",
    status: "Pending",
  },
];

export const appointmentColumns = [
  { key: "id", label: "Booking ID" },
  { key: "customer", label: "Customer" },
  { key: "vendor", label: "Vendor" },
  { key: "service", label: "Service" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "status", label: "Status" },
];

export const adminAppointments = [
  {
    id: "APT-1001",
    customer: "Riya Sharma",
    vendor: "Beautdeluxe Salon",
    service: "Full Body Scrub",
    date: "26 Jun 2026",
    time: "04:00 PM",
    status: "Confirmed",
  },
  {
    id: "APT-1002",
    customer: "Anjali Verma",
    vendor: "Home Cleaning Pro",
    service: "Home Cleaning",
    date: "27 Jun 2026",
    time: "11:30 AM",
    status: "Pending",
  },
  {
    id: "APT-1003",
    customer: "Sneha Jain",
    vendor: "Spa At Home",
    service: "Hair Spa",
    date: "28 Jun 2026",
    time: "02:00 PM",
    status: "Completed",
  },
];

export const vendorColumns = [
  { key: "id", label: "Vendor ID" },
  { key: "name", label: "Vendor Name" },
  { key: "owner", label: "Owner" },
  { key: "category", label: "Category" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
];

export const vendors = [
  {
    id: "VEN-101",
    name: "Beautdeluxe Salon",
    owner: "Aarav Mehta",
    category: "Beauty",
    city: "Dubai",
    status: "Approved",
  },
  {
    id: "VEN-102",
    name: "Home Cleaning Pro",
    owner: "Priya Nair",
    category: "Cleaning",
    city: "Abu Dhabi",
    status: "Pending",
  },
  {
    id: "VEN-103",
    name: "Fashion Store",
    owner: "Karan Shah",
    category: "Fashion",
    city: "Sharjah",
    status: "Active",
  },
];

export const customerColumns = [
  { key: "id", label: "Customer ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "orders", label: "Orders" },
  { key: "status", label: "Status" },
];

export const customers = [
  {
    id: "CUS-101",
    name: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "+91 9876543210",
    orders: "12",
    status: "Active",
  },
  {
    id: "CUS-102",
    name: "Priya Verma",
    email: "priya@example.com",
    phone: "+91 9876543211",
    orders: "8",
    status: "Active",
  },
  {
    id: "CUS-103",
    name: "Amit Jain",
    email: "amit@example.com",
    phone: "+91 9876543212",
    orders: "3",
    status: "Blocked",
  },
];

export const paymentColumns = [
  { key: "id", label: "Payment ID" },
  { key: "vendor", label: "Vendor" },
  { key: "amount", label: "Amount" },
  { key: "method", label: "Method" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

export const payments = [
  {
    id: "PAY-1001",
    vendor: "Beautdeluxe Salon",
    amount: "₹24,500",
    method: "Online",
    date: "26 Jun 2026",
    status: "Paid",
  },
  {
    id: "PAY-1002",
    vendor: "Home Cleaning Pro",
    amount: "₹12,800",
    method: "Bank Transfer",
    date: "25 Jun 2026",
    status: "Pending",
  },
  {
    id: "PAY-1003",
    vendor: "Fashion Store",
    amount: "₹18,900",
    method: "Online",
    date: "24 Jun 2026",
    status: "Failed",
  },
];



export const vendorOrderColumns = [
  { key: "id", label: "Order ID" },
  { key: "customer", label: "Customer" },
  { key: "type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "payment", label: "Payment" },
  { key: "status", label: "Status" },
];

export const vendorOrders = [
  {
    id: "ORD-2001",
    customer: "Riya Sharma",
    type: "Service",
    amount: "₹1,499",
    payment: "Paid",
    status: "Delivered",
  },
  {
    id: "ORD-2002",
    customer: "Anjali Verma",
    type: "Service",
    amount: "₹899",
    payment: "Pending",
    status: "Processing",
  },
  {
    id: "ORD-2003",
    customer: "Sneha Jain",
    type: "Product",
    amount: "₹2,499",
    payment: "Paid",
    status: "Confirmed",
  },
];

export const vendorProductColumns = [
  { key: "id", label: "Product ID" },
  { key: "name", label: "Product Name" },
  { key: "category", label: "Category" },
  { key: "stock", label: "Stock" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

export const vendorProducts = [
  {
    id: "VPRD-101",
    name: "Organic Face Cream",
    category: "Beauty",
    stock: "45",
    price: "₹799",
    status: "Active",
  },
  {
    id: "VPRD-102",
    name: "Hair Care Kit",
    category: "Salon",
    stock: "18",
    price: "₹1,299",
    status: "Active",
  },
  {
    id: "VPRD-103",
    name: "Skin Glow Pack",
    category: "Beauty",
    stock: "0",
    price: "₹999",
    status: "Pending",
  },
];

export const vendorServiceColumns = [
  { key: "id", label: "Service ID" },
  { key: "name", label: "Service Name" },
  { key: "category", label: "Category" },
  { key: "duration", label: "Duration" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

export const vendorServices = [
  {
    id: "VSRV-101",
    name: "Full Body Scrub",
    category: "Beauty",
    duration: "60 min",
    price: "₹1,499",
    status: "Active",
  },
  {
    id: "VSRV-102",
    name: "Hair Spa",
    category: "Salon",
    duration: "45 min",
    price: "₹1,299",
    status: "Active",
  },
  {
    id: "VSRV-103",
    name: "Home Facial",
    category: "Beauty",
    duration: "50 min",
    price: "₹999",
    status: "Pending",
  },
];

export const vendorAppointmentColumns = [
  { key: "id", label: "Booking ID" },
  { key: "customer", label: "Customer" },
  { key: "service", label: "Service" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "status", label: "Status" },
];

export const vendorAppointments = [
  {
    id: "APT-2001",
    customer: "Riya Sharma",
    service: "Full Body Scrub",
    date: "26 Jun 2026",
    time: "04:00 PM",
    status: "Confirmed",
  },
  {
    id: "APT-2002",
    customer: "Anjali Verma",
    service: "Hair Spa",
    date: "27 Jun 2026",
    time: "11:30 AM",
    status: "Pending",
  },
  {
    id: "APT-2003",
    customer: "Sneha Jain",
    service: "Home Facial",
    date: "28 Jun 2026",
    time: "02:00 PM",
    status: "Completed",
  },
];

export const slotColumns = [
  { key: "id", label: "Slot ID" },
  { key: "day", label: "Day" },
  { key: "startTime", label: "Start Time" },
  { key: "endTime", label: "End Time" },
  { key: "capacity", label: "Capacity" },
  { key: "status", label: "Status" },
];

export const vendorSlots = [
  {
    id: "SLT-101",
    day: "Monday",
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    capacity: "5",
    status: "Available",
  },
  {
    id: "SLT-102",
    day: "Tuesday",
    startTime: "02:00 PM",
    endTime: "06:00 PM",
    capacity: "8",
    status: "Available",
  },
  {
    id: "SLT-103",
    day: "Wednesday",
    startTime: "11:00 AM",
    endTime: "03:00 PM",
    capacity: "4",
    status: "Blocked",
  },
];

export const earningColumns = [
  { key: "id", label: "Earning ID" },
  { key: "orderId", label: "Order ID" },
  { key: "amount", label: "Amount" },
  { key: "commission", label: "Commission" },
  { key: "payout", label: "Payout" },
  { key: "status", label: "Status" },
];

export const vendorEarnings = [
  {
    id: "ERN-1001",
    orderId: "ORD-2001",
    amount: "₹1,499",
    commission: "₹150",
    payout: "₹1,349",
    status: "Paid",
  },
  {
    id: "ERN-1002",
    orderId: "ORD-2002",
    amount: "₹899",
    commission: "₹90",
    payout: "₹809",
    status: "Pending",
  },
  {
    id: "ERN-1003",
    orderId: "ORD-2003",
    amount: "₹2,499",
    commission: "₹250",
    payout: "₹2,249",
    status: "Paid",
  },
];

export const adminCategoryColumns = [
  { key: "id", label: "Category ID" },
  { key: "name", label: "Category Name" },
  { key: "parent", label: "Parent Category" },
  { key: "type", label: "Type" },
  { key: "createdBy", label: "Created By" },
  { key: "status", label: "Status" },
];

export const adminCategories = [
  {
    id: "CAT-101",
    name: "Electronics",
    parent: "-",
    type: "Product",
    createdBy: "Admin",
    status: "Active",
  },
  {
    id: "CAT-102",
    name: "Wardrobe",
    parent: "Apparel",
    type: "Product",
    createdBy: "Vendor Request",
    status: "Pending",
  },
  {
    id: "CAT-103",
    name: "Men Wardrobe",
    parent: "Wardrobe",
    type: "Product",
    createdBy: "Vendor Request",
    status: "Pending",
  },
];

export const vendorCategoryColumns = [
  { key: "id", label: "Request ID" },
  { key: "name", label: "Category Name" },
  { key: "parent", label: "Parent Category" },
  { key: "type", label: "Type" },
  { key: "note", label: "Note" },
  { key: "status", label: "Status" },
];

export const vendorCategories = [
  {
    id: "VCAT-101",
    name: "Men Wardrobe",
    parent: "Wardrobe",
    type: "Product",
    note: "For men clothing products",
    status: "Pending",
  },
  {
    id: "VCAT-102",
    name: "Women Wardrobe",
    parent: "Wardrobe",
    type: "Product",
    note: "For women apparel section",
    status: "Approved",
  },
  {
    id: "VCAT-103",
    name: "Kids Wardrobe",
    parent: "Wardrobe",
    type: "Product",
    note: "For kids clothing products",
    status: "Pending",
  },
];

export const adminCouponColumns = [
  { key: "id", label: "Coupon ID" },
  { key: "code", label: "Code" },
  { key: "discount", label: "Discount" },
  { key: "scope", label: "Scope" },
  { key: "expiry", label: "Expiry" },
  { key: "status", label: "Status" },
];

export const adminCoupons = [
  {
    id: "CPN-101",
    code: "WELCOME10",
    discount: "10%",
    scope: "Full Marketplace",
    expiry: "31 Jul 2026",
    status: "Active",
  },
  {
    id: "CPN-102",
    code: "FESTIVE20",
    discount: "20%",
    scope: "All Products",
    expiry: "15 Aug 2026",
    status: "Active",
  },
];

export const vendorCouponColumns = [
  { key: "id", label: "Coupon ID" },
  { key: "code", label: "Code" },
  { key: "discount", label: "Discount" },
  { key: "appliesTo", label: "Applies To" },
  { key: "expiry", label: "Expiry" },
  { key: "status", label: "Status" },
];

export const vendorCoupons = [
  {
    id: "VCPN-101",
    code: "BEAUTY10",
    discount: "10%",
    appliesTo: "My Services",
    expiry: "31 Jul 2026",
    status: "Active",
  },
  {
    id: "VCPN-102",
    code: "SALON20",
    discount: "20%",
    appliesTo: "Hair Spa",
    expiry: "15 Aug 2026",
    status: "Pending",
  },
];

export const adminReviewColumns = [
  { key: "id", label: "Review ID" },
  { key: "customer", label: "Customer" },
  { key: "vendor", label: "Vendor" },
  { key: "rating", label: "Rating" },
  { key: "message", label: "Message" },
  { key: "status", label: "Status" },
];

export const adminReviews = [
  {
    id: "REV-101",
    customer: "Rahul Sharma",
    vendor: "Beautdeluxe Salon",
    rating: "5 Stars",
    message: "Excellent service",
    status: "Approved",
  },
  {
    id: "REV-102",
    customer: "Amit Jain",
    vendor: "Fashion Store",
    rating: "2 Stars",
    message: "Delivery delayed",
    status: "Pending",
  },
];

export const vendorReviewColumns = [
  { key: "id", label: "Review ID" },
  { key: "customer", label: "Customer" },
  { key: "rating", label: "Rating" },
  { key: "message", label: "Message" },
  { key: "status", label: "Status" },
];

export const vendorReviews = [
  {
    id: "VREV-101",
    customer: "Riya Sharma",
    rating: "5 Stars",
    message: "Very professional service",
    status: "Approved",
  },
  {
    id: "VREV-102",
    customer: "Sneha Jain",
    rating: "4 Stars",
    message: "Good experience",
    status: "Approved",
  },
];

export const adminNotificationColumns = [
  { key: "id", label: "Notification ID" },
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "target", label: "Target" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

export const adminNotifications = [
  {
    id: "NOT-101",
    title: "New vendor category request",
    type: "Category",
    target: "Admin",
    date: "26 Jun 2026",
    status: "Pending",
  },
  {
    id: "NOT-102",
    title: "Payment pending",
    type: "Payment",
    target: "Admin",
    date: "26 Jun 2026",
    status: "Active",
  },
];

export const vendorNotificationColumns = [
  { key: "id", label: "Notification ID" },
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

export const vendorNotifications = [
  {
    id: "VNOT-101",
    title: "New order received",
    type: "Order",
    date: "26 Jun 2026",
    status: "Active",
  },
  {
    id: "VNOT-102",
    title: "Category request approved",
    type: "Category",
    date: "25 Jun 2026",
    status: "Active",
  },
];


























export const vendorDashboardStats = [
  { title: "My Products", value: "42", change: "+8%" },
  { title: "My Services", value: "18", change: "+5%" },
  { title: "Total Orders", value: "846", change: "+14%" },
  { title: "Total Earnings", value: "₹2.8L", change: "+18%" },
];

export const vendorMonthlyEarnings = [
  { month: "Jan", amount: 30000 },
  { month: "Feb", amount: 55000 },
  { month: "Mar", amount: 45000 },
  { month: "Apr", amount: 70000 },
  { month: "May", amount: 50000 },
  { month: "Jun", amount: 65000 },
  { month: "Jul", amount: 75000 },
  { month: "Aug", amount: 48000 },
  { month: "Sep", amount: 68000 },
  { month: "Oct", amount: 85000 },
  { month: "Nov", amount: 78000 },
  { month: "Dec", amount: 60000 },
];

export const vendorTodayBookings = {
  total: 12,
  label: "Total appointments scheduled for today.",
};

export const vendorUpcomingAppointments = [
  {
    id: "APT-1001",
    customer: "Riya Sharma",
    service: "Full Body Scrub",
    date: "26 Jun 2026",
    time: "04:00 PM",
    status: "Confirmed",
  },
  {
    id: "APT-1002",
    customer: "Anjali Verma",
    service: "Home Salon",
    date: "27 Jun 2026",
    time: "11:30 AM",
    status: "Pending",
  },
  {
    id: "APT-1003",
    customer: "Sneha Jain",
    service: "Hair Spa",
    date: "28 Jun 2026",
    time: "02:00 PM",
    status: "Completed",
  },
];










export const adminDashboardStats = [
  { title: "Total Vendors", value: "128", change: "+12%" },
  { title: "Total Customers", value: "3,782", change: "+18%" },
  { title: "Total Orders", value: "5,359", change: "+21%" },
  { title: "Total Revenue", value: "₹18.4L", change: "+16%" },
];

export const adminMonthlyRevenue = [
  { month: "Jan", amount: 120000 },
  { month: "Feb", amount: 180000 },
  { month: "Mar", amount: 150000 },
  { month: "Apr", amount: 230000 },
  { month: "May", amount: 210000 },
  { month: "Jun", amount: 280000 },
  { month: "Jul", amount: 320000 },
  { month: "Aug", amount: 260000 },
  { month: "Sep", amount: 340000 },
  { month: "Oct", amount: 410000 },
  { month: "Nov", amount: 380000 },
  { month: "Dec", amount: 450000 },
];

export const adminTodayOrders = {
  total: 36,
  label: "Total marketplace orders received today.",
};

export const adminRecentOrders = [
  {
    id: "ORD-1001",
    customer: "Rahul Sharma",
    vendor: "Beautdeluxe Salon",
    type: "Service",
    amount: "₹1,499",
    paymentStatus: "Paid",
    status: "Completed",
  },
  {
    id: "ORD-1002",
    customer: "Priya Verma",
    vendor: "Fashion Store",
    type: "Product",
    amount: "₹2,299",
    paymentStatus: "Paid",
    status: "Processing",
  },
  {
    id: "ORD-1003",
    customer: "Amit Jain",
    vendor: "Home Cleaning Pro",
    type: "Service",
    amount: "₹899",
    paymentStatus: "Pending",
    status: "Pending",
  },
];







export const adminSalesReportStats = [
  { title: "Total Revenue", value: "₹18.4L", change: "+16%" },
  { title: "Paid Payments", value: "₹14.8L", change: "+12%" },
  { title: "Pending Payments", value: "₹3.6L", change: "+7%" },
  { title: "Vendor Payouts", value: "₹9.2L", change: "+10%" },
];

export const adminOrdersReportStats = [
  { title: "Total Orders", value: "5,359", change: "+21%" },
  { title: "Completed Orders", value: "3,842", change: "+18%" },
  { title: "Pending Orders", value: "846", change: "+9%" },
  { title: "Cancelled Orders", value: "126", change: "-3%" },
];

export const adminVendorReportStats = [
  { title: "Total Vendors", value: "128", change: "+12%" },
  { title: "Active Vendors", value: "104", change: "+9%" },
  { title: "Pending Vendors", value: "18", change: "+4%" },
  { title: "Blocked Vendors", value: "6", change: "-2%" },
];

export const vendorSalesReportStats = [
  { title: "Total Earnings", value: "₹2.8L", change: "+18%" },
  { title: "Paid Payouts", value: "₹2.1L", change: "+14%" },
  { title: "Pending Payouts", value: "₹70K", change: "+8%" },
  { title: "Commission Paid", value: "₹42K", change: "+6%" },
];

export const vendorOrdersReportStats = [
  { title: "Total Orders", value: "846", change: "+14%" },
  { title: "Completed Orders", value: "624", change: "+12%" },
  { title: "Pending Orders", value: "138", change: "+7%" },
  { title: "Cancelled Orders", value: "22", change: "-2%" },
];