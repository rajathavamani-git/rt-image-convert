import React, { useRef, useState, useEffect } from "react";
import rtimageCompression from "browser-image-compression";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import toast, { Toaster } from "react-hot-toast";
import { IoCloseCircle, IoChevronForward, IoEye } from "react-icons/io5";
import { TbDragDrop } from "react-icons/tb";
import { MdDarkMode, MdOutlineDarkMode, MdDownloading } from "react-icons/md";

import { SiConvertio } from "react-icons/si";
import { FiChevronsRight } from "react-icons/fi";
import { RiFileDownloadFill } from "react-icons/ri";




// toast.success("Toaster is back!", { duration: 1000000 });

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_SIZE = 150 * 1024; // 150 KB

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const allowedExtensions = ["png", "jpeg", "jpg", "webp"];

const RTImageConverter = () => {
  const [rtfiles, rtsetFiles] = useState([]);
  const [rtconvertedFiles, rtsetConvertedFiles] = useState([]);
  const [rtoutputFormat, rtsetOutputFormat] = useState("webp");
  const [rtdownloadedIds, rtsetDownloadedIds] = useState([]);
  const [rtconversionStates, rtsetConversionStates] = useState({});
  const [rtIsConvertAllDisabled, rtsetIsConvertAllDisabled] = useState(false);
  const rtfileInputRef = useRef();
  const [rtallDownloaded, rtsetAllDownloaded] = useState(false);
  const [rtDragActive, rtsetDragActive] = useState(false);
  const [rttheme, rtsetTheme] = useState("dark");
  
  const [rtconversionProgress, rtsetConversionProgress] = useState({});
  const [rtviewImage, setRtViewImage] = useState(null);


useEffect(() => {
  const rtstoredTheme = localStorage.getItem("rttheme");
  const defaultTheme = rtstoredTheme || "dark";
  rtsetTheme(defaultTheme);
  document.documentElement.setAttribute("data-theme", defaultTheme);
}, []);

const rttoggleTheme = () => {
  const rtnewTheme = rttheme === "dark" ? "light" : "dark";
  rtsetTheme(rtnewTheme);
  document.documentElement.setAttribute("data-theme", rtnewTheme);
  localStorage.setItem("rttheme", rtnewTheme);
};

useEffect(() => {
  return () => {
    rtfiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    rtconvertedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
  };
}, []);
  

useEffect(() => {
  if (rtviewImage) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [rtviewImage]);

const rtgenerateFileId = (file) => {
  const baseId = `${file.name}_${file.size}_${file.lastModified}`;
  const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  return `${baseId}_${uniqueSuffix}`;
};

const rtaddIncomingFiles = (incomingFileList) => {

// Check for invalid file types first (both MIME type and extension)
const invalidFiles = Array.from(incomingFileList).filter(file => {
  const ext = file.name.split('.').pop().toLowerCase();
  const isMimeAllowed = allowedMimeTypes.includes(file.type);
  const isExtAllowed = allowedExtensions.includes(ext);
  return !(isMimeAllowed && isExtAllowed);
});

if (invalidFiles.length) {
  toast.error("Only PNG, JPG, and WEBP images are allowed.", { duration: 2000 });
  return;
}

  // Check for files exceeding max size
  const oversizedFiles = Array.from(incomingFileList).filter(
    f => f.size > MAX_FILE_SIZE
  );

  if (oversizedFiles.length) {
    toast.error(`Some files exceed the max size limit of 10 MB and were not added.`, { duration: 2000 });
  }

  // Filter incoming files: valid type and size <= max size
const rtincomingFiles = Array.from(incomingFileList).filter(f => {
  const ext = f.name.split('.').pop().toLowerCase();
  return allowedMimeTypes.includes(f.type) &&
         allowedExtensions.includes(ext) &&
         f.size <= MAX_FILE_SIZE;
});


  if (!rtincomingFiles.length) return;

  const rtnewFiles = rtincomingFiles.map(file => ({
    file,
    id: rtgenerateFileId(file),
    preview: URL.createObjectURL(file),
  }));

  const rtnewIds = rtnewFiles.map(f => f.id);
  
if (rtnewFiles.length > 0) {
  rtsetOutputFormat((currentFormat) => {
    if (currentFormat && currentFormat !== "") return currentFormat; // Don't overwrite if already set
    // Determine new format from first file type
    const firstFileType = rtnewFiles[0].file.type.toLowerCase();
    if (firstFileType.includes("webp")) {
      return "png";
    } else if (firstFileType.includes("png")) {
      return "webp";
    } else if (
      firstFileType.includes("jpeg") ||
      firstFileType.includes("jpg")
    ) {
      return "webp";
    }
    return "webp";
  });
}

rtsetFiles(prev => {
  const filesMap = new Map();
  prev.forEach(f => filesMap.set(f.id, f));
  rtnewFiles.forEach(newFile => {
    filesMap.set(newFile.id, newFile);
  });
  return Array.from(filesMap.values());
});


  rtsetConversionStates(prev => {
    const copy = { ...prev };
    rtnewIds.forEach(id => delete copy[id]);
    return copy;
  });

  if (rtfileInputRef.current) rtfileInputRef.current.value = "";

  rtsetIsConvertAllDisabled(false);
};

  

  const rthandleFileSelect = (e) => rtaddIncomingFiles(e.target.files);
  
  const rthandleFileDrop = (e) => {
    e.preventDefault();
    rtsetDragActive(false);
    rtaddIncomingFiles(e.dataTransfer.files);
  };
  
  const rthandleDragOver = (e) => {
    e.preventDefault();
    rtsetDragActive(true);
  };
  
  const rthandleDragLeave = () => {
    rtsetDragActive(false);
  };
  
  
  const rthandleRemoveFile = (idToRemove) => {
    const fileToRemove = rtfiles.find(f => f.id === idToRemove);
    const convertedToRemove = rtconvertedFiles.find(f => f.id === idToRemove);
    if (fileToRemove?.preview) URL.revokeObjectURL(fileToRemove.preview);
    if (convertedToRemove?.preview) URL.revokeObjectURL(convertedToRemove.preview);
  
    rtsetFiles(prev => prev.filter(f => f.id !== idToRemove));
    rtsetConvertedFiles(prev => prev.filter(f => f.id !== idToRemove));
    rtsetDownloadedIds(prev => prev.filter(id => id !== idToRemove));
    rtsetConversionStates(prev => {
      const copy = { ...prev };
      delete copy[idToRemove];
      return copy;
    });
  };
  
  
const rtcompressImage = async (inputFile, id, outputFormat) => {

  const rtoptionsBase = {
    maxSizeMB: 0.15,
    useWebWorker: true,
    alwaysKeepResolution: true,
    fileType: `image/${outputFormat}`,
    initialQuality: 0.9,
    onProgress: (p) => {
      rtsetConversionProgress((prev) => ({
        ...prev,
        [id]: Math.round(p),
      }));
    },
  };

  try {
    let compressedFile = await rtimageCompression(inputFile, rtoptionsBase);

    // Fallback if still too large
    if (compressedFile.size > MAX_SIZE) {
      const fallbackOptions = {
        ...rtoptionsBase,
        initialQuality: 0.8,
      };
      compressedFile = await rtimageCompression(inputFile, fallbackOptions);
    }

    return { 
      compressedFile, 
      isOversized: compressedFile.size > MAX_SIZE 
    };
  } catch (err) {
    toast.error("Compression failed: " + err.message);
    throw err;
  }
};

const rtdecideFormat = (rtoutputFormat) => {
  return rtoutputFormat || "webp";
};

const rtrevoke = (obj) => { if (obj?.preview) URL.revokeObjectURL(obj.preview); };

const rtrmEverywhere = (id) => {
  rtsetFiles(prev => {
    const target = prev.find(f => f.id === id);
    rtrevoke(target);
    return prev.filter(f => f.id !== id);
  });
  rtsetConvertedFiles(prev => {
    const target = prev.find(f => f.id === id);
    rtrevoke(target);
    return prev.filter(f => f.id !== id);
  });
  rtsetDownloadedIds(prev => prev.filter(did => did !== id));
  rtsetConversionStates(prev => {
    const copy = { ...prev };
    delete copy[id];
    return copy;
  });
};

const rthandleConvertSingle = async ({ file, id, formatToUse }) => {
  try {
    const fmt = formatToUse || rtdecideFormat(rtoutputFormat);

    // mark loading
    rtsetConversionStates(prev => ({ ...prev, [id]: "loading" }));

    const compressedFile = await rtimageCompression(file, {
      maxSizeMB: 0.15,            // target ~150 KB
      useWebWorker: true,
      fileType: `image/${fmt}`,   // ensure output format
      alwaysKeepResolution: true,
      initialQuality: 0.9,
    });

    // if still over 150 KB → remove everywhere
    if (compressedFile.size > 150 * 1024) {
      rtrmEverywhere(id);
      toast.error(`"${file.name}" could not be compressed under 150KB and was removed.`, { duration: 2000 });
      return;
    }

    // success → place in converted list
    const converted = {
      id,
      name: file.name.replace(/\.\w+$/, `.${fmt}`),
      file: compressedFile,
      sizeKB: (compressedFile.size / 1024).toFixed(1),
      status: "success",
      preview: URL.createObjectURL(compressedFile),
    };

    rtsetConvertedFiles(prev => {
      const i = prev.findIndex(f => f.id === id);
      if (i !== -1) {
        const copy = [...prev];
        rtrevoke(copy[i]);
        copy[i] = converted;
        return copy;
      }
      return [...prev, converted];
    });

    rtsetConversionStates(prev => ({ ...prev, [id]: "success" }));
  } catch (err) {
    // on error → remove everywhere
    rtrmEverywhere(id);
    toast.error(`"${file.name}" failed to convert and was removed.`, { duration: 2000 });
    console.error("Single conversion error:", err);
  }
};

const rthandleConvertAll = async () => {
  const queue = rtfiles.map(({ file, id }) => ({ file, id }));
  const fmt = rtdecideFormat(rtoutputFormat);

  await Promise.all(
    queue.map(({ file, id }) =>
      rtconversionStates[id] === "success"
        ? Promise.resolve()
        : rthandleConvertSingle({ file, id, formatToUse: fmt })
    )
  );

  toast.success("Batch conversion finished.", { duration: 2000 });
};

  
const rthandleResetAll = () => {
  rtfiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
  rtconvertedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));

  rtsetFiles([]);
  rtsetConvertedFiles([]);
  rtsetDownloadedIds([]);
  rtsetConversionStates({});
  rtsetAllDownloaded(false);
  rtsetIsConvertAllDisabled(false);

  if (rtfileInputRef.current) {
    rtfileInputRef.current.value = "";
  }

  toast.success("Reset completed!", { duration: 2000 });
};


const rtisFileConverted = (id) => {
  return rtconversionStates[id] === "success";
};


  const rthandleDownloadAll = async () => {
    const rttoDownload = rtconvertedFiles.filter(
      f => f.status === "success" && !rtdownloadedIds.includes(f.id)
    );
  
    if (rttoDownload.length === 1) {
      const { file, name, id } = rttoDownload[0];
      saveAs(file, name);
      rtsetDownloadedIds(prev => [...prev, id]);
  
      // ✅ Check if all files are downloaded
      if (rtconvertedFiles.filter(f => f.status === "success").length === 1) {
        rtsetAllDownloaded(true);
      }
      return;
    }
  
    const rtzip = new JSZip();
    let validFileCount = 0;
  
    await Promise.all(
      rttoDownload.map(async ({ file, name }) => {
        try {
          if (!file || typeof file.arrayBuffer !== "function") return;
  
          const buffer = await file.arrayBuffer();
          if (buffer && buffer.byteLength > 0) {
            rtzip.file(name, buffer);
            validFileCount++;
          } else {
            console.warn(`Skipping empty or invalid file: ${name}`);
          }
        } catch (err) {
          console.error(`Failed to add ${name} to zip:`, err);
        }
      })
    );
  
    if (validFileCount === 0) {
      toast.error("No valid files to download.", { duration: 2000 });
      return;
    }
  
    const blob = await rtzip.generateAsync({ type: "blob" });
    saveAs(blob, "rt-converted-images.zip");
    toast.success("All images downloaded successfully!", { duration: 2000 });
    rtsetDownloadedIds(prev => [...prev, ...rttoDownload.map(f => f.id)]);
  
    // ✅ Final check — set allDownloaded if all successful converted files were downloaded
    if (validFileCount === rtconvertedFiles.filter(f => f.status === "success").length) {
      rtsetAllDownloaded(true);
    }
  };
    
const generateLiveMessage = () => {
  const convertingFiles = rtfiles.filter(f => rtconversionStates[f.id] === "loading");
  const successCount = rtfiles.filter(f => rtconversionStates[f.id] === "success").length;
  const failCount = rtfiles.filter(f => rtconversionStates[f.id] === "fail").length;

  if (convertingFiles.length > 0) {
    const first = convertingFiles[0];
    const progress = rtconversionProgress[first.id] || 0;
    return `Status update: Converting ${first.file.name}: ${progress}%. ${convertingFiles.length} image${convertingFiles.length > 1 ? "s" : ""} converting.`;
  }

  if (successCount > 0 && failCount === 0) {
    return `Status update: Conversion complete for all ${successCount} image${successCount > 1 ? "s" : ""}.`;
  }

  if (successCount > 0 || failCount > 0) {
    return `Status update: Conversion finished. ${successCount} succeeded, ${failCount} failed.`;
  }

  return <p className="rt_live_status_update">Status update: No ongoing conversions.</p>;

};

  
  return (
    <React.Fragment>
      <nav>
  
        <SiConvertio color="white"  className="rt_app_logo" size={28} />       
        <h2 className="app_title">RT Image Converter</h2>
        
      <button
  onClick={rttoggleTheme}
  aria-label={`Switch to ${rttheme === "dark" ? "light" : "dark"} theme`}
  style={{ cursor: "pointer", background: "none", border: "none" }}
>
  {rttheme === "light" ? (
    <MdDarkMode color="white" size={32} className="rt_theme_toggle_icon" />
  ) : (
    <MdOutlineDarkMode color="white" size={32} className="rt_theme_toggle_icon" />
  )}
</button>


      </nav>
    <div className="rt_img_convert_container">
      
      <div aria-live="polite" aria-atomic="true" className="sr-only">
    {generateLiveMessage()}
  </div>
  
      <div
  className={`rt_drag_drop_container ${rtDragActive ? "rt_drag_active" : ""}`}
  onClick={() => rtfileInputRef.current.click()}
  onDrop={rthandleFileDrop}
  onDragOver={rthandleDragOver}
  onDragLeave={rthandleDragLeave}
  tabIndex={0}
  aria-label="Upload images by drag and drop or by clicking"
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      rtfileInputRef.current.click();
    }
  }}
>
  <div className="rt_drag_icon_wrap">
    <TbDragDrop size={60} className="rt_drag_icon light" />
    <TbDragDrop size={60} className="rt_drag_icon dark" />
  </div>

  <h3>Drag & Drop Images Here or Click to Select</h3>
</div>

      <input
  className="rt_input"
  type="file"
  accept=".png,.jpeg,.jpg,.webp"
  multiple
  ref={rtfileInputRef}
  onChange={rthandleFileSelect}
  style={{ display: "none" }}
/>

      <div className="rt_format_buttons_wrapper">
        <label className="rt_format_label">Convert to Format:</label>
        <div className="rt_format_buttons">
          {["webp", "jpeg", "png"].map((format) => (
            <button
              key={format}
              className={`rt-btn-format ${rtoutputFormat === format ? "active" : ""}`}
              onClick={() => rtsetOutputFormat(format)}
              type="button"
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {rtfiles.length > 0 && (
        <div className="rt_uploaded_file_list_container">
          <h4 className="rt_sub_title">
  Uploaded Files: <span className="uploaded_file_count">{rtfiles.length}</span>
</h4>

<ul className="rt_uploaded_file_list">
  {rtfiles.map(({ file, id, preview }) => {
    const isLoading = rtconversionStates[id] === "loading";
    const isSuccess = rtconversionStates[id] === "success";

    return (
      <li key={id} className="rt_file_card">
        <div className="rt_file_left">
          <img src={preview} alt="thumb" className="rt_file_thumb" />
          <h5 className="rt_file_name">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </h5>
        </div>
        <div className="rt_file_right">
          <button
            className={`rt-btn rt-btn-convert ${isSuccess ? "converted_done" : ""}`}
            onClick={() => rthandleConvertSingle({ file, id })}
            disabled={isLoading || rtisFileConverted(id)}
          >
            {isSuccess
              ? "Converted"
              : isLoading
              ? "Converting..."
              : "Convert"}
            <IoChevronForward className="rt_convert_icon" size={14} />

          </button>

<IoCloseCircle size={24}
  className="rt_file_close"
  onClick={() => rthandleRemoveFile(id)} />
        </div>

        {isLoading && (
          <div className="rt_progress_container">
  <div
    className="rt_progress_bar"
    style={{ width: `${rtconversionProgress[id] || 0}%` }}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={rtconversionProgress[id] || 0}
    aria-label={`Conversion progress for ${file.name}`}
  >
    {rtconversionProgress[id] || 0}%
  </div>
</div>
        )}
      </li>
    );
  })}
</ul>

         {rtfiles.filter(f => rtconversionStates[f.id] !== "success").length > 1 && (
  <button
    className="rt-btn rt-btn-outline"
    onClick={rthandleConvertAll}
    disabled={rtIsConvertAllDisabled}
  >
    Convert All
    <FiChevronsRight size={16} className="rt_convert_all_icon" />
  </button>
)}

        </div>
      )}

      {rtconvertedFiles.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h4 className="rt_sub_title">
  Converted Images:{" "}
  <span className="rt_converted_files_count">
    {rtconvertedFiles.filter(f => f.status === "success").length}
  </span>
</h4>
          <ul className="rt_converted_list_ul">
          {rtconvertedFiles.map(({ id, name, sizeKB, file, status, preview }) => (
          
  <li key={id} className="rt_file_card">
    {["success", "oversize"].includes(status) ? (
  <>
    <div className="rt_file_left">
      {preview && (
        <img src={preview} alt="converted preview" className="rt_file_thumb" />
      )}
      <h5 className="rt_file_name">{name} ({sizeKB} KB)</h5>
      

    </div>
    <div className="rt_file_right">


<IoEye size={20} className="rt_show_img" style={{ cursor: "pointer" }} onClick={() => setRtViewImage(preview)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setRtViewImage(preview); }}
  aria-label={`View full image ${name}`} />

      <button
  className={`rt-btn rt-btn-download ${
    rtdownloadedIds.includes(id) ? "rt-btn-download-done" : ""
  }`}
onClick={() => {
  saveAs(file, name);
  rtsetDownloadedIds(prev => {
    const updated = [...prev, id];
    
    // Check if all converted success files have been downloaded
    const allDownloaded = rtconvertedFiles
      .filter(f => f.status === "success")
      .every(f => updated.includes(f.id));
      
    if (allDownloaded) {
      rtsetAllDownloaded(true);
    }
    
    return updated;
  });
}}

  disabled={rtdownloadedIds.includes(id)}
>
  {rtdownloadedIds.includes(id) ? "Downloaded" : "Download"}
  
  <RiFileDownloadFill className="rt_download_icon" size={16} />

</button>

    </div>

  </>
) : (
  <span style={{ color: "crimson" }}>Failed</span>
)}

  </li>
))}

          </ul>
        </div>
      )}

{(() => {
  if (rtfiles.length === 0) return null;

  const allConverted = rtfiles.every(({ id }) =>
    ["success", "fail"].includes(rtconversionStates[id])
  );
  if (!allConverted) return null;

  const pendingDownloads = rtconvertedFiles.filter(
    f => f.status === "success" && !rtdownloadedIds.includes(f.id)
  );

  if (pendingDownloads.length >= 2 && !rtallDownloaded) {
    return (
      <button
        className="rt-btn rt-btn-outline"
        onClick={rthandleDownloadAll}
        style={{ marginTop: 10 }}
      >
        Download All
        <MdDownloading size={20} className="rt_all_download_icon" />
      </button>
    );
  } else if (rtallDownloaded) {
    return (
      <button
        className="rt-btn rt-btn-outline rt-reset-btn"
        onClick={rthandleResetAll}
        style={{ marginTop: 10 }}
      >
        Reset
      </button>
    );
  }

  return null;
})()}

<Toaster
  reverseOrder={false}
  toastOptions={{
    className: 'rt_toast_msg',
  }}
/>

{rtviewImage && (
  <div
    className="rt_image_modal"
    onClick={() => setRtViewImage(null)}
    role="dialog"
    aria-modal="true"
    tabIndex={-1}
    aria-label="Full size image preview"
  >
    <div className="rt_image_modal_content" onClick={e => e.stopPropagation()}>
      
      <IoCloseCircle size={28} className="rt_modal_close_btn"
          onClick={() => setRtViewImage(null)}
          aria-label="Close image preview" />
        
      <img src={rtviewImage} alt="Full preview" className="rt_full_image" />
    </div>
  </div>
)}

<footer>
  <p className="rtfooterTxt">
    © {new Date().getFullYear()} Raja Thavamani | Image Converter App | Contact: +91 96550 05530
  </p>
</footer>

    </div>
    </React.Fragment>
  );
  
};

export default RTImageConverter;
