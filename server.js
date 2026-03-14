const express = require("express")
const fs = require("fs")
const path = require("path")
const handlebars = require("handlebars")
const puppeteer = require("puppeteer")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use((req,res,next)=>{
console.log(`Incoming request: ${req.method} ${req.url}`)
next()
})

const TEMPLATE_PATH = path.join(__dirname,"templates","resume.hbs")

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

// Arrays
data.education = Array.isArray(data.education) ? data.education : []
data.experience = Array.isArray(data.experience) ? data.experience : []
data.projects = Array.isArray(data.projects) ? data.projects : []
data.skills = Array.isArray(data.skills) ? data.skills : []

return data
}

// Health check
app.get("/",(req,res)=>{
res.send("Resume API running")
})


// PREVIEW RESUME (HTML preview in browser)
app.post("/preview-resume",(req,res)=>{

try{

const resumeData = validateResumeData(req.body)

const templateHtml = fs.readFileSync(TEMPLATE_PATH,"utf8")

const template = handlebars.compile(templateHtml)

const finalHtml = template(resumeData)

res.send(finalHtml)

}catch(err){

console.error(err)
res.status(500).send("Error rendering resume preview")

}

})


// GENERATE PDF
app.post("/generate-resume", async (req,res)=>{

    console.log("Generate resume endpoint hit")

try{

const resumeData = req.body
console.log("Resume JSON received")

const templateHtml = fs.readFileSync(TEMPLATE_PATH,"utf8")
console.log("Template loaded")

const template = handlebars.compile(templateHtml)

const finalHtml = template(resumeData)
console.log("HTML rendered")

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.76/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
})

console.log("Browser launched")

const page = await browser.newPage()

await page.setContent(finalHtml,{
waitUntil:"networkidle0"
})

console.log("HTML loaded into browser")

const pdf = await page.pdf({
format:"A4",
printBackground:true
})

console.log("PDF generated, size:", pdf.length)

await browser.close()

res.set({
"Content-Type":"application/pdf",
"Content-Disposition":"attachment; filename=resume.pdf"
})

res.send(pdf)

}catch(err){

console.error("PDF generation error:",err)
res.status(500).send("Error generating resume")

}

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log(`Server running on port ${PORT}`)
})