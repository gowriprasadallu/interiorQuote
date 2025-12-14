import React, { useState, useRef, useEffect } from 'react';
import { Plus, Printer, Download, Trash2, GripVertical, FileText, Save, RefreshCw, XCircle, LogOut, Loader2, List, Grid } from 'lucide-react';
import { formatCurrency, parseNumber } from './utils/format';
import { INITIAL_SECTIONS, CLIENT_DETAILS } from './data/initialData';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './lib/supabase';
// import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error

  // App Data State
  const [clientName, setClientName] = useState(CLIENT_DETAILS.name);
  const [projectTitle, setProjectTitle] = useState(CLIENT_DETAILS.project);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const printRef = useRef();

  // 1. Auth & Initial Load
  useEffect(() => {
    // Timeout to ensure we don't get stuck in loading state if Supabase fails
    // const timer = setTimeout(() => setLoading(false), 2000);

    // supabase.auth.getSession().then(({ data: { session } }) => {
    //   setSession(session);
    //   if (session) {
    //     loadUserData(session.user.id);
    //   } else {
    //     setLoading(false);
    //   }
    //   clearTimeout(timer);
    // }).catch(err => {
    //   console.error("Auth check failed", err);
    //   setLoading(false);
    // });

    // const {
    //   data: { subscription },
    // } = supabase.auth.onAuthStateChange((_event, session) => {
    //   setSession(session);
    //   if (!session) setLoading(false);
    // });

    // return () => subscription.unsubscribe();
    setLoading(false);
  }, []);

  // 2. Load Data from Supabase
  const loadUserData = async (userId) => {
    setLoading(true);
    try {
      // Fetch the most recent quote for now (simplification)
      const { data, error } = await supabase
        .from('quotes')
        .select('content')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data?.content) {
        const content = data.content;
        setClientName(content.clientName || CLIENT_DETAILS.name);
        setProjectTitle(content.projectTitle || CLIENT_DETAILS.project);
        setSections(content.sections || INITIAL_SECTIONS);
        setTaxRate(content.taxRate || 0);
        setDiscount(content.discount || 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Save Data to Supabase (Auto-save or Manual)
  const saveData = async () => {
    if (!session) return;
    setSaveStatus('saving');

    const content = {
      clientName,
      projectTitle,
      sections,
      taxRate,
      discount
    };

    try {
      // Check if user has a quote already
      const { data: existing } = await supabase
        .from('quotes')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      let error;
      if (existing) {
        // Update
        const { error: err } = await supabase
          .from('quotes')
          .update({
            content,
            updated_at: new Date()
          })
          .eq('id', existing.id);
        error = err;
      } else {
        // Insert
        const { error: err } = await supabase
          .from('quotes')
          .insert([
            {
              user_id: session.user.id,
              content,
              updated_at: new Date()
            }
          ]);
        error = err;
      }

      if (error) throw error;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving:', err);
      setSaveStatus('error');
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

  // Basic CRUD Handlers
  const handleReset = () => {
    if (confirm('Reset to default template? This will lose current changes.')) {
      setSections(INITIAL_SECTIONS);
      setClientName(CLIENT_DETAILS.name);
      setProjectTitle(CLIENT_DETAILS.project);
      setTaxRate(0);
      setDiscount(0);
    }
  };

  const handleClear = () => {
    if (confirm('Clear all data?')) {
      setSections([]);
      setClientName('');
      setProjectTitle('');
      setTaxRate(0);
      setDiscount(0);
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: Date.now(),
        name: 'NEW ROOM',
        items: [{ id: Date.now() + 1, description: 'New Item', width: 0, height: 0, depth: 0, unit: 'sft', rate: 0 }]
      }
    ]);
  };

  const removeSection = (sectionId) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(sections.filter(s => s.id !== sectionId));
    }
  };

  const updateSectionName = (id, name) => {
    setSections(sections.map(s => s.id === id ? { ...s, name } : s));
  };

  const addItem = (sectionId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: [...s.items, { id: Date.now(), description: '', width: 0, height: 0, depth: 0, unit: 'sft', rate: 0 }]
        };
      }
      return s;
    }));
  };

  const removeItem = (sectionId, itemId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: s.items.filter(i => i.id !== itemId)
        };
      }
      return s;
    }));
  };

  const updateItem = (sectionId, itemId, field, value) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
        };
      }
      return s;
    }));
  };

  // Calculations
  const calculateItemTotal = (item) => {
    const w = parseNumber(item.width);
    const h = parseNumber(item.height);
    const r = parseNumber(item.rate);

    let qty = 0;
    if (item.unit.toLowerCase() === 'sft') {
      if (h === 0 && w > 0) qty = w;
      else qty = w * h;
    } else {
      qty = w;
    }

    return qty * r;
  };

  const calculateSectionTotal = (section) => {
    return section.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  };

  const calculateSubTotal = () => {
    return sections.reduce((acc, section) => acc + calculateSectionTotal(section), 0);
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubTotal();
    const discAmount = sub * (discount / 100);
    const taxableAmount = sub - discAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    return taxableAmount + taxAmount;
  };

  const handleExportPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    // Ensure fonts are loaded before capturing
    await document.fonts.ready;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Quotation_${clientName.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#ca8a04]" size={40} />
      </div>
    );
  }

  // if (!session) {
  //   return <Auth />;
  // }

  return (
    <div className="min-h-screen pb-32">
      {/* Premium Glass Header - Sticky */}
      <nav className="glass-panel z-50 relative sticky top-0">
        <div className="container mx-auto px-6 flex items-center justify-between" style={{ minHeight: '5rem' }}>

          {/* Logo Section */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ca8a04] to-[#facc15] rounded-xl flex items-center justify-center text-white font-bold shadow-lg transform rotate-3">
                Q
              </div>
              <div>
                <span className="font-bold text-2xl tracking-tight text-[#0f172a] font-serif">Interior<span className="text-[#ca8a04]">Quote</span></span>
                {saveStatus === 'saving' && <span className="hidden md:inline-block ml-3 text-xs text-gray-500 animate-pulse">Saving...</span>}
                {saveStatus === 'saved' && <span className="hidden md:inline-block ml-3 text-xs text-green-600">Saved</span>}
              </div>
            </div>

            {/* Mobile Actions Toggle (could be improved, but stacking for now) */}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-center md:justify-end w-full md:w-auto mt-3 md:mt-0">
            <button
              onClick={saveData}
              className="btn btn-outline text-xs px-3"
              title="Save to Cloud"
            >
              <Save size={16} className="mr-1" /> <span className="hidden sm:inline">Save</span>
            </button>

            {!isPreviewMode && (
              <>
                <button onClick={handleReset} className="btn btn-outline text-xs px-3" title="Reset">
                  <RefreshCw size={14} />
                </button>
                <button onClick={handleClear} className="btn btn-outline text-xs px-3 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300" title="Clear">
                  <XCircle size={14} />
                </button>
                <div className="hidden md:block h-8 w-[1px] bg-gray-200 mx-2"></div>
              </>
            )}

            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`btn ${isPreviewMode ? 'btn-outline' : 'btn-primary'} flex-1 md:flex-none justify-center`}
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </button>

            {isPreviewMode && (
              <button onClick={handleExportPDF} className="btn btn-accent shadow-lg shadow-yellow-500/20 flex-1 md:flex-none justify-center">
                <Download size={18} /> <span className="hidden sm:inline">PDF</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="ml-2 text-gray-400 hover:text-gray-600 hidden md:block" // Hidden on mobile for space
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Editor Mode */}
        {!isPreviewMode && (
          <div className="animate-fade-in space-y-8">
            {/* Project Details Card */}
            <div className="card relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#ca8a04]"></div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 font-serif">
                <FileText className="text-[#ca8a04]" size={24} />
                Project Details
              </h2>
              <div className="grid grid-cols-1 gap-6 md:gap-8">
                <div>
                  <label className="label">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="input text-lg font-medium"
                    placeholder="Enter Client Name"
                  />
                </div>
                <div>
                  <label className="label">Project Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="input text-lg font-medium"
                    placeholder="Enter Project Title"
                  />
                </div>
                <div>
                  <label className="label">Discount (%)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="input text-lg font-medium"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label">Tax / GST (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="input text-lg font-medium"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section, sIndex) => (
                <div key={section.id} className="card animate-fade-in group hover:border-[#ca8a04]/30 transition-colors duration-300 p-0 overflow-hidden" style={{ animationDelay: `${sIndex * 100}ms` }}>
                  {/* Section Header */}
                  <div className="bg-gray-50 p-4 md:p-5 border-b border-gray-100 flex flex-col md:flex-row items-center gap-4">

                    {/* Top Row on Mobile: Number + Delete */}
                    <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[#fefce8] border border-[#fef08a] text-[#854d0e] flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {sIndex + 1}
                      </div>
                      <button onClick={() => removeSection(section.id)} className="btn-danger-ghost md:hidden" title="Delete Section">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Center: Title Input */}
                    <div className="flex-1 w-full relative">
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => updateSectionName(section.id, e.target.value)}
                        className="input-section-title text-center md:text-left"
                        placeholder="SECTION NAME"
                        title={section.name}
                      />
                    </div>

                    {/* Right: Actions (Desktop) / Subtotal (Mobile) */}
                    <div className="flex items-center justify-between w-full md:w-auto gap-6">
                      <div className="flex items-center gap-2 md:block md:text-right w-full md:w-auto justify-between">
                        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Subtotal</p>
                        <p className="text-lg font-bold text-[#ca8a04]">{formatCurrency(calculateSectionTotal(section))}</p>
                      </div>
                      <button onClick={() => removeSection(section.id)} className="hidden md:flex btn-danger-ghost" title="Delete Section">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Items Table - Horizontal Scroll on Small Screens */}
                  <div className="desktop-table-view table-responsive-wrapper">
                    <table className="premium-table min-w-[800px] md:min-w-full">
                      <thead>
                        <tr>
                          <th className="w-10 text-center">#</th>
                          <th className="w-[30%] min-w-[200px]">Item Description</th>
                          <th className="w-20 text-center">W</th>
                          <th className="w-20 text-center">H</th>
                          <th className="w-20 text-center">D</th>
                          <th className="w-24 text-center">Unit</th>
                          <th className="w-28 text-right">Rate</th>
                          <th className="w-28 text-right">Amount</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item, iIndex) => (
                          <tr key={item.id} className="group/row">
                            <td className="text-center text-gray-400 font-medium">{iIndex + 1}</td>
                            <td>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                                className="table-input"
                                placeholder="Description"
                                title={item.description}
                              />
                            </td>
                            <td><input type="number" value={item.width} onChange={(e) => updateItem(section.id, item.id, 'width', e.target.value)} className="table-input text-center" placeholder="0" /></td>
                            <td><input type="number" value={item.height} onChange={(e) => updateItem(section.id, item.id, 'height', e.target.value)} className="table-input text-center" placeholder="0" /></td>
                            <td><input type="number" value={item.depth} onChange={(e) => updateItem(section.id, item.id, 'depth', e.target.value)} className="table-input text-center" placeholder="0" /></td>
                            <td>
                              <select
                                value={item.unit}
                                onChange={(e) => updateItem(section.id, item.id, 'unit', e.target.value)}
                                className="table-input text-center cursor-pointer"
                              >
                                <option value="sft">Sft</option>
                                <option value="rft">Rft</option>
                                <option value="nos">Nos</option>
                                <option value="ls">L.S</option>
                              </select>
                            </td>
                            <td><input type="number" value={item.rate} onChange={(e) => updateItem(section.id, item.id, 'rate', e.target.value)} className="table-input text-right" placeholder="0" /></td>
                            <td className="text-right font-semibold text-gray-800">
                              {formatCurrency(calculateItemTotal(item))}
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => removeItem(section.id, item.id)}
                                className="btn-delete-row mx-auto opacity-100 lg:opacity-0 group-hover/row:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for Items */}
                  <div className="mobile-card-view space-y-4 p-4">
                    {section.items.map((item, iIndex) => (
                      <div key={item.id} className="mobile-item-card">
                        <div className="mobile-item-badge">
                          {iIndex + 1}
                        </div>

                        <div>
                          <label className="label text-[10px] mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                            className="input w-full p-2 text-sm"
                            placeholder="Item Description"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="label text-[10px] text-center mb-1">Width</label>
                            <input
                              type="number"
                              value={item.width}
                              onChange={(e) => updateItem(section.id, item.id, 'width', e.target.value)}
                              className="input text-center p-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="label text-[10px] text-center mb-1">Height</label>
                            <input
                              type="number"
                              value={item.height}
                              onChange={(e) => updateItem(section.id, item.id, 'height', e.target.value)}
                              className="input text-center p-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="label text-[10px] text-center mb-1">Depth</label>
                            <input
                              type="number"
                              value={item.depth}
                              onChange={(e) => updateItem(section.id, item.id, 'depth', e.target.value)}
                              className="input text-center p-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label text-[10px] mb-1">Unit</label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(section.id, item.id, 'unit', e.target.value)}
                              className="input w-full p-2 text-sm"
                            >
                              <option value="sft">Sft</option>
                              <option value="rft">Rft</option>
                              <option value="nos">Nos</option>
                              <option value="ls">L.S</option>
                            </select>
                          </div>
                          <div>
                            <label className="label text-[10px] mb-1">Rate</label>
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(section.id, item.id, 'rate', e.target.value)}
                              className="input text-right p-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Total Amount</span>
                            <span className="text-lg font-bold text-[#ca8a04]">{formatCurrency(calculateItemTotal(item))}</span>
                          </div>
                          <button
                            onClick={() => removeItem(section.id, item.id)}
                            className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => addItem(section.id)}
                      className="btn-add-item"
                    >
                      <Plus size={18} /> Add New Item
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-8 pb-32">
                <button onClick={addSection} className="btn btn-primary px-8 text-lg rounded-full shadow-2xl hover:scale-105 transition-transform w-full md:w-auto justify-center">
                  <Plus size={24} /> Add Section
                </button>
              </div>
            </div>

            {/* Bottom Calculation Bar - Responsive */}
            <div className="fixed bottom-4 md:bottom-8 left-0 right-0 z-40">
              <div className="container mx-auto px-4 md:px-6">
                <div className="bg-[#1e293b] text-white p-4 md:p-6 rounded-2xl shadow-premium flex flex-col md:flex-row items-center justify-between pointer-events-auto shadow-2xl gap-4">

                  {/* Total Display (Swap order for mobile importance) */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-8 px-2 md:px-4 order-1 md:order-2">
                    <div className="hidden md:flex flex-col items-end">
                      <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Items</p>
                      <p className="text-xl md:text-2xl font-bold">{sections.length}</p>
                    </div>
                    <div className="hidden md:block h-10 w-[1px] bg-gray-700"></div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                      <p className="text-[#fbbf24] text-xs uppercase tracking-wider font-semibold">Total Estimate</p>
                      <p className="text-2xl md:text-3xl font-bold font-serif text-[#fbbf24]">{formatCurrency(calculateGrandTotal())}</p>
                    </div>
                  </div>

                  {/* Review Button */}
                  <button
                    onClick={() => setIsPreviewMode(true)}
                    className="btn btn-accent w-full md:w-auto justify-center rounded-xl px-8 shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform order-2 md:order-1"
                  >
                    <FileText size={18} className="mr-2" /> Review Quote
                  </button>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Mode */}
        {isPreviewMode && (
          <div className="flex justify-center animate-fade-in pb-20">
            <div className="w-full overflow-hidden flex justify-center">
              {/* Responsive Wrapper around print-container handled by CSS Scale */}

              {/* Actual Printable Area */}
              <div ref={printRef} className="print-container">
                {/* PDF Header */}
                <div className="print-header">
                  <div>
                    <h1 className="print-title">{clientName}</h1>
                    <p className="print-subtitle">Interior Quotation</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold uppercase mb-1">{projectTitle}</p>
                    <p className="text-xs font-bold text-gray-600 uppercase">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="print-table">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">S.No</th>
                      <th className="text-left">Item & Description</th>
                      <th className="w-16 text-center">W</th>
                      <th className="w-16 text-center">H</th>
                      <th className="w-16 text-center">D</th>
                      <th className="w-16 text-center">Unit</th>
                      <th className="w-28 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section, sIndex) => (
                      <React.Fragment key={section.id}>
                        {/* Section Header */}
                        <tr className="print-section-row">
                          <td className="text-center">{sIndex + 1}</td>
                          <td colSpan={6}>{section.name}</td>
                        </tr>
                        {/* Items */}
                        {section.items.map((item, iIndex) => (
                          <tr key={item.id}>
                            <td className="text-center text-gray-500">{iIndex + 1}</td>
                            <td>{item.description}</td>
                            <td className="text-center">{item.width || '-'}</td>
                            <td className="text-center">{item.height || '-'}</td>
                            <td className="text-center">{item.depth || '-'}</td>
                            <td className="text-center capitalize">{item.unit}</td>
                            <td className="text-right font-medium">{formatCurrency(calculateItemTotal(item))}</td>
                          </tr>
                        ))}
                        {/* Section Subtotal */}
                        <tr className="print-total-row">
                          <td colSpan={5} className="border-none"></td>
                          <td className="text-right">TOTAL</td>
                          <td className="text-right">{formatCurrency(calculateSectionTotal(section))}</td>
                        </tr>
                      </React.Fragment>
                    ))}

                    {/* Grand Total Calculation Block */}
                    <tr>
                      <td colSpan={7} className="h-4 border-l-0 border-r-0"></td>
                    </tr>

                    {/* Subtotal - Only show if there is tax or discount */}
                    {(discount > 0 || taxRate > 0) && (
                      <tr className="text-sm">
                        <td colSpan={5} className="border-none"></td>
                        <td className="text-right bg-gray-50 border-b border-black p-2">Subtotal</td>
                        <td className="text-right border-b border-black p-2 pr-4">{formatCurrency(calculateSubTotal())}</td>
                      </tr>
                    )}

                    {/* Discount */}
                    {discount > 0 && (
                      <tr className="text-sm text-green-700">
                        <td colSpan={5} className="border-none"></td>
                        <td className="text-right bg-green-50 border-b border-black p-2">Discount ({discount}%)</td>
                        <td className="text-right border-b border-black p-2 pr-4">-{formatCurrency(calculateSubTotal() * (discount / 100))}</td>
                      </tr>
                    )}

                    {/* Tax */}
                    {taxRate > 0 && (
                      <tr className="text-sm text-amber-700">
                        <td colSpan={5} className="border-none"></td>
                        <td className="text-right bg-amber-50 border-b border-black p-2">Tax / GST ({taxRate}%)</td>
                        <td className="text-right border-b border-black p-2 pr-4">+{formatCurrency((calculateSubTotal() - (calculateSubTotal() * (discount / 100))) * (taxRate / 100))}</td>
                      </tr>
                    )}

                    {/* Final Grand Total */}
                    <tr className="font-bold text-sm">
                      <td colSpan={5} className="border-none"></td>
                      <td className="text-right bg-gray-100 uppercase border-b border-black p-2">Grand Total</td>
                      <td className="text-right border-b border-black p-2 pr-4">{formatCurrency(calculateGrandTotal())}</td>
                    </tr>
                    <tr className="font-bold text-sm text-[#b91c1c]">
                      <td colSpan={5} className="border-none"></td>
                      <td className="text-right bg-red-50 border-b border-black p-2">Round Off</td>
                      <td className="text-right border-b border-black p-2 pr-4">{Math.round(calculateGrandTotal()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer Notes */}
                <div className="print-footer-grid">
                  <div className="print-terms">
                    <h3>TERMS AND CONDITIONS:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Valid for 15 days from date of issue.</li>
                      <li>Additional items charged separately.</li>
                      <li>Advance payment is non-refundable.</li>
                      <li>Dispatch time: 5 weeks from final confirmation.</li>
                      <li>Subject to Hyderabad Jurisdiction.</li>
                    </ul>
                  </div>
                  <div className="print-signature">
                    <div className="text-[10px] font-bold text-gray-500">
                      Authorized Signature
                    </div>
                    <div className="text-xs font-bold mt-8 border-t border-black pt-2 inline-block ml-auto min-w-[150px] text-center">
                      For InteriorQuote
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 text-[8px] text-gray-300">
                  Generated by InteriorQuote
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
