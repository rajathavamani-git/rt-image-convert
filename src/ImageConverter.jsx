import React, { useRef, useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import toast, { Toaster } from "react-hot-toast";

const ImageConverter = () => {
  const [files, setFiles] = useState([]);
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState("webp");
  const [downloadedIds, setDownloadedIds] = useState([]);
  const [conversionStates, setConversionStates] = useState({});
  const [isConvertAllDisabled, setIsConvertAllDisabled] = useState(false);
  const fileInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const [theme, setTheme] = useState("light");

  
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };
  

useEffect(() => {
  return () => {
    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
  };
}, [files]);

useEffect(() => {
  return () => {
    convertedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
  };
}, [convertedFiles]);
  
  const generateFileId = (file) => `${file.name}_${file.size}`;

  const addIncomingFiles = (incomingFileList) => {
    const incomingFiles = Array.from(incomingFileList).filter(f => f.type.startsWith("image/"));
    if (!incomingFiles.length) return;
  
    const newFiles = incomingFiles.map(file => ({
      file,
      id: generateFileId(file),
      preview: URL.createObjectURL(file),
    }));
    
    const newIds = newFiles.map(f => f.id);
  
    // Detect the first file's type and set output format accordingly
    if (newFiles.length > 0) {
      const firstFileType = newFiles[0].file.type;
      if (firstFileType.includes("webp")) {
        setOutputFormat("png"); // If it's webp, set output to PNG
      } else if (firstFileType.includes("png")) {
        setOutputFormat("webp"); // If it's png, set output to WEBP
      } else if (firstFileType.includes("jpeg") || firstFileType.includes("jpg")) {
        setOutputFormat("webp"); // If it's jpeg/jpg, set output to WEBP
      }
    }
  
    // Update the file states
    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const filteredNew = newFiles.filter(f => !existingIds.has(f.id));
      return [...prev, ...filteredNew];
    });
  
    setDownloadedIds(prev => prev.filter(id => !newIds.includes(id)));
    setConversionStates(prev => {
      const copy = { ...prev };
      newIds.forEach(id => delete copy[id]);
      return copy;
    });
  
    // Clear input for re-selection
    if (fileInputRef.current) fileInputRef.current.value = "";
  
    setIsConvertAllDisabled(false);
  };
  

  const handleFileSelect = (e) => addIncomingFiles(e.target.files);
  
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    addIncomingFiles(e.dataTransfer.files);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  
  const handleDragLeave = () => {
    setDragActive(false);
  };
  
  const compressImage = async (inputFile) => {
    if (inputFile.size / 1024 < 100) return inputFile;

    const fileSizeMB = inputFile.size / (1024 * 1024);
    const quality = fileSizeMB > 2 ? 0.6 : fileSizeMB > 1 ? 0.7 : fileSizeMB > 0.5 ? 0.8 : 0.9;

    const options = {
      maxSizeMB: 0.15,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: quality,
      fileType: `image/${outputFormat}`,
      maxIteration: 5,
    };

    try {
      return await imageCompression(inputFile, options);
    } catch (err) {
      toast.error("Conversion failed: " + err.message);
      throw err;
    }
  };
  

  const handleConvertSingle = async ({ file, id }) => {
    if (conversionStates[id] === "loading") return;
  
    setConversionStates(prev => ({ ...prev, [id]: "loading" }));
  
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed); // 👈 Generate preview URL
  
      const newFile = {
        id,
        name: file.name.replace(/\.\w+$/, `.${outputFormat}`),
        file: compressed,
        sizeKB: (compressed.size / 1024).toFixed(1),
        status: "success",
        preview: previewUrl, // 👈 Store preview
      };
  
      setConvertedFiles(prev => [...prev.filter(f => f.id !== id), newFile]);
      setConversionStates(prev => ({ ...prev, [id]: "success" }));
    } catch {
      setConvertedFiles(prev => [...prev, { id, name: file.name, status: "fail" }]);
      setConversionStates(prev => ({ ...prev, [id]: "fail" }));
    }
  };
  

  const handleConvertAll = async () => {
    const unconverted = files.filter(f => conversionStates[f.id] !== "success");
    if (!unconverted.length) return;

    await Promise.all(unconverted.map(({ file, id }) => handleConvertSingle({ file, id })));
    setIsConvertAllDisabled(true);
    toast.success("All images converted!");
  };

  const handleDownloadAll = async () => {
    const toDownload = convertedFiles.filter(
      f => f.status === "success" && !downloadedIds.includes(f.id)
    );

    if (toDownload.length === 1) {
      const { file, name, id } = toDownload[0];
      saveAs(file, name);
      setDownloadedIds(prev => [...prev, id]);
      return;
    }

    const zip = new JSZip();
    await Promise.all(
      toDownload.map(async ({ file, name }) => {
        const buffer = await file.arrayBuffer();
        zip.file(name, buffer);
      })
    );

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "rt-converted-images.zip");
    setDownloadedIds(prev => [...prev, ...toDownload.map(f => f.id)]);
  };

  const isFileConverted = (id) =>
    convertedFiles.some(f => f.id === id && f.status === "success");

  return (
    <React.Fragment>
      <nav>
        <img src="/app-logo.webp" className="rt_app_logo" alt="logo" />
        <h2 className="app_title">RT Image Converter</h2>
        
        <div onClick={toggleTheme} aria-label="Toggle Theme" style={{ cursor: "pointer" }}>
  <img className="rt_theme_toggle_icon"
    src={theme === "light" ? "/light-mode.webp" : "/dark-mode.webp"}
    alt="Toggle theme icon"/>
</div>


      </nav>
    <div className="rt_img_convert_container">
      
      <div
          className={`rt_drag_drop_container ${dragActive ? 'rt_drag_active' : ''}`}
          onClick={() => fileInputRef.current.click()}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
      >
        <div className="rt_drag_icon_wrap">
        <img src="/drag-icon-light.webp" alt="drag" className="rt_drag_icon light" />
        <img src="/drag-icon-dark.webp" alt="drag" className="rt_drag_icon dark" />
        </div>
          
          <h3>Drag & Drop Images Here or Click to Select</h3>
      </div>
      <input
        className="rt_input"
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <div className="rt_format_buttons_wrapper">
        <label className="rt_format_label">Convert to Format:</label>
        <div className="rt_format_buttons">
          {["webp", "jpeg", "png"].map((format) => (
            <button
              key={format}
              className={`rt-btn-format ${outputFormat === format ? "active" : ""}`}
              onClick={() => setOutputFormat(format)}
              type="button"
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <div className="rt_uploaded_file_list_container">
          <h4 className="rt_sub_title">
  Uploaded Files: <span className="uploaded_file_count">{files.length}</span>
</h4>

          <ul className="rt_uploaded_file_list">
              {files.map(({ file, id, preview }) => (
                <li key={id} className="rt_file_card">
                  <div className="rt_file_left">
                    <img src={preview} alt="thumb" className="rt_file_thumb" />
                      <h5 className="rt_file_name">{file.name} ({(file.size / 1024).toFixed(1)} KB)</h5>
                    
                  </div>
                  <div className="rt_file_right">
                  <button
                    className={`rt-btn rt-btn-convert ${
                      conversionStates[id] === "success" ? "converted_done" : ""
                    }`}
                    onClick={() => handleConvertSingle({ file, id })}
                    disabled={conversionStates[id] === "loading" || isFileConverted(id)}
                  >
                    {conversionStates[id] === "success"
                      ? "Converted"
                      : conversionStates[id] === "loading"
                      ? "Converting..."
                      : "Convert"}
                      
                      <img src="/convert-icon.webp" width="14" height="14" className="rt_convert_icon" alt="convert-icon" />
                  </button>

                  </div>
                </li>
              ))}
          </ul>


          {files.filter(f => conversionStates[f.id] !== "success").length > 1 && (
            <button
              className="rt-btn rt-btn-outline"
              onClick={handleConvertAll}
              disabled={isConvertAllDisabled}
            >
              Convert All
              <img src="/convert-all.webp" width="16" height="16" className="rt_convert_all_icon" alt="convert-all-icon" />
            </button>
          )}
        </div>
      )}

      {convertedFiles.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h4 className="rt_sub_title">
  Converted Images:{" "}
  <span className="rt_converted_files_count">
    {convertedFiles.filter(f => f.status === "success").length}
  </span>
</h4>
          <ul className="rt_converted_list_ul">
          {convertedFiles.map(({ id, name, sizeKB, file, status, preview }) => (
  <li key={id} className="rt_file_card">
    {status === "success" ? (
      <>
        <div className="rt_file_left">
          {preview && (
            <img src={preview} alt="converted preview" className="rt_file_thumb" />
          )}
          <h5 className="rt_file_name">{name} ({sizeKB} KB)</h5>
        </div>
        <div className="rt_file_right">
        <button
            className={`rt-btn rt-btn-download ${
              downloadedIds.includes(id) ? "rt-btn-download-done" : ""
            }`}
            onClick={() => {
              saveAs(file, name);
              setDownloadedIds(prev => [...prev, id]);
            }}
            disabled={downloadedIds.includes(id)}
          >
            {downloadedIds.includes(id) ? "Downloaded" : "Download"}
            <img src="/download.webp" width="18" height="18" className="rt_download_icon" alt="download icon" />
        </button>

        </div>
      </>
    ) : (
      <span style={{ color: "red" }}>Failed</span>
    )}
  </li>
))}

          </ul>
        </div>
      )}

      {(() => {
        if (files.length === 0) return null;
        const allConverted = files.every(f => {
          const state = conversionStates[f.id];
          return state === "success" || state === "fail";
        });

        if (!allConverted) return null;
        const successful = convertedFiles.filter(f => f.status === "success");
        const pending = successful.filter(f => !downloadedIds.includes(f.id));
        if (pending.length < 2) return null;

        return (
          <button
            className="rt-btn rt-btn-outline"
            onClick={handleDownloadAll}
            style={{ marginTop: 10 }}
          >
            Download All
            {/* <span>({pending.length})</span> */}
            <img src="/all-download.webp" width="14" height="14" className="rt_all_download_icon" alt="all downlaod icon" />
          </button>
        );
      })()}
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        toastOptions={{
          className: 'rt_toast_msg',
        }}
      />

<footer>
  <h6>
    © {new Date().getFullYear()} Raja Thavamani | Image Converter App | Contact: +91 96550 05530
  </h6>
</footer>

    </div>
    </React.Fragment>
  );
  
  
};

export default ImageConverter;
