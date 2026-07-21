"use client"

import React from 'react'
import * as XLSX from "xlsx"
const page = () => {

    const handleFileUpload = async (e:any) =>{
        const file = e.target.files?.[0]
        if (!file) {
            alert("Please select a file");
            return;
        }

        const data = await file.arrayBuffer();

        const workbook = XLSX.read(data)
        const sheetname = workbook.Sheets;
        console.log(sheetname)


    }
  return (
    <div>
    <div>
        <h1>Upload Recordings</h1>
        <div>
            <form action="">
                <input type="file" 
                accept='.xlsx,.xls'
                onChange={handleFileUpload}
                />
                <input type="submit" />
            </form>

        </div>
    </div>

    </div>
  )
}

export default page