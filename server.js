// Import required libraries
const express = require("express")
const fs = require("fs")
const path = require("path")
const handlebars = require("handlebars")
const puppeteer = require("puppeteer")
const cors = require("cors")

// Initialize express app
const app = express()

// Enable JSON request parsing
app.use(express.json())

// Enable CORS (required when Custom GPT or browser calls API)
app.use(cors())

// Simple request logger for debugging
app.use((req,res,next)=>{
console.log(`Incoming request: ${req.method} ${req.url}`)
next()
})


// Path to Handlebars template
const TEMPLATE_PATH = path.join(__dirname,"templates","resume.hbs")

// Folder where generated PDFs will be stored
const GENERATED_DIR = path.join(__dirname,"generated")

// Ensure the generated folder exists
if(!fs.existsSync(GENERATED_DIR)){
fs.mkdirSync(GENERATED_DIR)
}


// -------------------------------
// Resume Data Validation
// -------------------------------
function validateResumeData(data){

if(!data){
throw new Error("Resume data missing")
}

// Required fields
data.name = data.name || ""
data.phone = data.phone || ""
data.email = data.email || ""
data.linkedin = data.linkedin || ""

data.summary = data.summary || ""

// Ensure arrays exist
data.education = Array.isArray(data.education) ? data.education : []
data.experience = Array.isArray(data.experience) ? data.experience : []
data.projects = Array.isArray(data.projects) ? data.projects : []
data.skills = Array.isArray(data.skills) ? data.skills : []

return data
}


// -------------------------------
// Health Check Endpoint
// -------------------------------
app.get("/",(req,res)=>{
res.send("Resume API running")
})


// -------------------------------
// Resume HTML Preview Endpoint
// Allows viewing the resume in browser before generating PDF
// -------------------------------
app.post("/preview-resume",(req,res)=>{

try{

const resumeData = validateResumeData(req.body)

// Load Handlebars template
const templateHtml = fs.readFileSync(TEMPLATE_PATH,"utf8")

// Compile template
const template = handlebars.compile(templateHtml)

// Render HTML
const finalHtml = template(resumeData)

// Send rendered HTML to browser
res.send(finalHtml)

}catch(err){

console.error(err)
res.status(500).send("Error rendering resume preview")

}

})


// -------------------------------
// Generate Resume PDF Endpoint
// -------------------------------
app.post("/generate-resume", async (req,res)=>{

console.log("Generate resume endpoint hit")

try{

// Validate resume data
const resumeData = validateResumeData(req.body)
console.log("Resume JSON received")

// Load Handlebars template
const templateHtml = fs.readFileSync(TEMPLATE_PATH,"utf8")
console.log("Template loaded")

// Compile template
const template = handlebars.compile(templateHtml)

// Render HTML
const finalHtml = template(resumeData)
console.log("HTML rendered")

// Launch Puppeteer browser
const browser = await puppeteer.launch({
headless: true,

// Explicit Chrome path (required on Render)
executablePath: path.join(
process.cwd(),
".cache/puppeteer/chrome/linux-146.0.7680.76/chrome-linux64/chrome"
),

args: [
"--no-sandbox",
"--disable-setuid-sandbox",
"--disable-dev-shm-usage",
"--disable-gpu"
]
})

console.log("Browser launched")

// Create new browser page
const page = await browser.newPage()

// Load rendered HTML into page
await page.setContent(finalHtml,{
waitUntil:"networkidle0"
})

console.log("HTML loaded into browser")

// Generate PDF
const pdf = await page.pdf({
format:"A4",
printBackground:true
})

console.log("PDF generated, size:", pdf.length)

// Close browser
await browser.close()

// Create unique file name
const fileName = `resume-${Date.now()}.pdf`
const filePath = path.join(GENERATED_DIR,fileName)

// Save PDF file
fs.writeFileSync(filePath,pdf)

// Return download URL
res.json({
success:true,
download_url:`/download/${fileName}`
})

}catch(err){

console.error("PDF generation error:",err)
res.status(500).send("Error generating resume")

}

})


// -------------------------------
// Download Generated Resume
// -------------------------------
app.get("/download/:file",(req,res)=>{

try{

const filePath = path.join(GENERATED_DIR,req.params.file)

// Check if file exists
if(!fs.existsSync(filePath)){
return res.status(404).send("File not found")
}

// Send file for download
res.download(filePath)

}catch(err){

console.error(err)
res.status(500).send("Error downloading file")

}

})


// -------------------------------
// Start Server
// -------------------------------
const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log(`Server running on port ${PORT}`)
})