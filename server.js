const express = require("express")
const fs = require("fs")
const path = require("path")
const handlebars = require("handlebars")
const puppeteer = require("puppeteer")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cors())

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

try{

const resumeData = req.body

const templateHtml = fs.readFileSync(TEMPLATE_PATH,"utf8")

const template = handlebars.compile(templateHtml)

const finalHtml = template(resumeData)

const browser = await puppeteer.launch({
headless: "new",
args: [
'--no-sandbox',
'--disable-setuid-sandbox',
'--disable-dev-shm-usage',
'--disable-gpu'
]
})

const page = await browser.newPage()

await page.setContent(finalHtml,{
waitUntil:"networkidle0"
})

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

console.error(err)
res.status(500).send("Error generating resume")

}

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log(`Server running on port ${PORT}`)
})