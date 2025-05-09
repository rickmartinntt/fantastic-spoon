import React, { useState } from 'react';

const PersonaPage = () => {
  const [textareaContent, setTextareaContent] = useState(
    'I am a home loan specialist with a large national bank and my job is to process loan documents, extract data from loan documents, and identify issues with loan documents.'
  );

  const handleCancel = () => {
    setTextareaContent(''); // Clear the content
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-1/3 bg-gray-100 p-4">
        <div className="space-y-4">
          {/* Button Group */}
          <div className="space-x-2">
            <button className="bg-blue-500 text-white px-4 py-2 rounded">Create</button>
            <button className="bg-blue-500 text-white px-4 py-2 rounded">Edit</button>
            <button className="bg-red-500 text-white px-4 py-2 rounded">Delete</button>
          </div>

          {/* Select Boxes */}
          <div className="space-y-2">
            <select className="w-full px-3 py-2 border rounded">
              <option>Persona Name</option>
              {/* Add options here */}
            </select>
            <select className="w-full px-3 py-2 border rounded">
              <option>Persona Type</option>
              {/* Add options here */}
            </select>
          </div>

          {/* File Browser */}
          <input type="file" className="w-full px-3 py-2 border rounded" />
        </div>
        {/* Button Group */}
          <div className="flex space-x-2 mt-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
      </div>

      {/* Right Panel */}
      <div className="w-2/3 bg-white p-4">
        <div className="flex flex-col h-full">
          {/* Multiline Text Box */}
          <textarea
            className="w-full p-3 border rounded shadow-md"
            style={{ resize: 'vertical' }} // Inline style for debugging
            value={textareaContent}
            onChange={(e) => setTextareaContent(e.target.value)}
            rows={10} // Start with 10 lines
          />
        </div>
      </div>
    </div>
  );
};

export default PersonaPage;
