import React, { useState, useEffect, useContext } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "../../style/css/fullcalendar.min.css";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import { Modal, DatePicker, TimePicker, Calendar as AntCalendar, theme } from 'antd';
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const Calendar = () => {
  const { selectedStore } = useContext(StoreContext);
  const { token } = theme.useToken();
  const [currentEvents, setCurrentEvents] = useState([]);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Form states
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("bg-primary");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchBookings = async () => {
    try {
      let query = supabase.from('bookings').select('*');
      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching bookings:", error);
        return;
      }
      
      const formattedEvents = data.map(booking => ({
        id: booking.id,
        title: booking.title,
        start: booking.start_date,
        end: booking.end_date,
        className: booking.category_color || 'bg-primary',
        extendedProps: {
          location: booking.location || "",
          description: booking.description || ""
        }
      }));
      
      setCurrentEvents(formattedEvents);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateSelect = (selectInfo) => {
    setIsEditMode(false);
    setSelectedEvent(null);
    setEventTitle("");
    setEventDate(dayjs(selectInfo.startStr));
    setStartTime(dayjs(selectInfo.startStr).hour(9).minute(0));
    setEndTime(dayjs(selectInfo.startStr).hour(10).minute(0));
    setEventLocation("");
    setEventDescription("");
    setCategoryColor("bg-primary");
    setIsModalVisible(true);
    selectInfo.view.calendar.unselect();
  };

  const handleEventClick = (clickInfo) => {
    setIsEditMode(false); // Fix: Set to View Mode when clicked
    setSelectedEvent(clickInfo.event);
    setEventTitle(clickInfo.event.title);
    setEventDate(dayjs(clickInfo.event.startStr));
    setStartTime(dayjs(clickInfo.event.startStr));
    setEndTime(clickInfo.event.endStr ? dayjs(clickInfo.event.endStr) : dayjs(clickInfo.event.startStr).add(1, 'hour'));
    setEventLocation(clickInfo.event.extendedProps.location || "");
    setEventDescription(clickInfo.event.extendedProps.description || "");
    setCategoryColor(clickInfo.event.classNames[0] || "bg-primary");
    setIsModalVisible(true);
  };

  const handleSaveBooking = async () => {
    if (!eventTitle) return alert("Nama Acara tidak boleh kosong");
    if (!eventDate) return alert("Tanggal Acara tidak boleh kosong");
    if (!startTime) return alert("Waktu Mulai tidak boleh kosong");
    if (!endTime) return alert("Waktu Selesai tidak boleh kosong");
    
    setLoading(true);
    
    // Combine Date and Time
    const startDateTime = eventDate.hour(startTime.hour()).minute(startTime.minute()).second(0).toISOString();
    const endDateTime = eventDate.hour(endTime.hour()).minute(endTime.minute()).second(0).toISOString();

    try {
      if (isEditMode && selectedEvent) {
        // Update
        const { error } = await supabase
          .from('bookings')
          .update({
            title: eventTitle,
            start_date: startDateTime,
            end_date: endDateTime,
            location: eventLocation,
            description: eventDescription,
            category_color: categoryColor
          })
          .eq('id', selectedEvent.id);
          
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('bookings')
          .insert([{
            title: eventTitle,
            start_date: startDateTime,
            end_date: endDateTime,
            location: eventLocation,
            description: eventDescription,
            category_color: categoryColor,
            branch_id: selectedStore || null
          }]);
          
        if (error) throw error;
      }
      
      setIsModalVisible(false);
      fetchBookings(); 
    } catch (err) {
      console.error("Error saving booking:", err);
      alert("Gagal menyimpan data! Pastikan Anda sudah menjalankan perintah SQL terbaru di Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedEvent) return;
    const confirmDelete = window.confirm("Hapus jadwal booking ini?");
    if (!confirmDelete) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', selectedEvent.id);
        
      if (error) throw error;
      setIsModalVisible(false);
      fetchBookings();
    } catch (err) {
      console.error("Error deleting booking:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventDrop = async (dropInfo) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          start_date: dropInfo.event.startStr,
          end_date: dropInfo.event.endStr || dropInfo.event.startStr,
        })
        .eq('id', dropInfo.event.id);
        
      if (error) {
        dropInfo.revert();
        console.error(error);
      }
    } catch (err) {
      dropInfo.revert();
      console.error(err);
    }
  };

  const wrapperStyle = {
    width: '100%',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: '8px',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="row align-items-center w-100">
            <div className="col-lg-10 col-sm-12">
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Calendar</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Manage Your calendar</h6>
            </div>
            <div className="col-lg-2 col-sm-12 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2"><Icon.RefreshCcw size={16}/></button>
              <button className="btn text-white fw-bold d-flex align-items-center justify-content-center gap-2" style={{background: '#ff9f43', borderRadius: '6px'}} onClick={() => {
                setIsEditMode(false);
                setSelectedEvent(null); // Fix: Clear previous selected event
                setEventTitle("");
                setEventDate(dayjs());
                setStartTime(dayjs().hour(9).minute(0));
                setEndTime(dayjs().hour(10).minute(0));
                setEventLocation("");
                setEventDescription("");
                setCategoryColor("bg-primary");
                setIsModalVisible(true);
              }}>
                <Icon.PlusCircle size={16} />
                Create
              </button>
            </div>
          </div>
        </div>
        
        <div className="row">
          <div className="col-lg-3 col-md-4">
             {/* Mini Calendar */}
             <div style={wrapperStyle} className="mb-4">
                <AntCalendar fullscreen={false} />
             </div>

             {/* Event Categories */}
             <div>
               <div className="d-flex justify-content-between align-items-center mb-3">
                 <h5 className="fw-bold mb-0">Event</h5>
                 <Icon.PlusCircle size={16} style={{color: '#ff9f43', cursor: 'pointer'}} />
               </div>
               <p className="text-muted mb-3" style={{fontSize: '12px'}}>Drag and drop your event or click in the calendar</p>
               
               <div className="d-flex flex-column gap-2">
                 <div className="p-2 px-3 rounded d-flex align-items-center" style={{background: '#e8f5e9', border: '1px solid #c8e6c9'}}>
                   <div className="rounded-circle me-2" style={{width: '12px', height: '12px', border: '2px solid #28c76f'}}></div>
                   <span style={{fontSize: '14px', color: '#555'}}>VIP / Penting</span>
                 </div>
                 <div className="p-2 px-3 rounded d-flex align-items-center" style={{background: '#fff3e0', border: '1px solid #ffe0b2'}}>
                   <div className="rounded-circle me-2" style={{width: '12px', height: '12px', border: '2px solid #ff9f43'}}></div>
                   <span style={{fontSize: '14px', color: '#555'}}>Menunggu (Tunggu)</span>
                 </div>
                 <div className="p-2 px-3 rounded d-flex align-items-center" style={{background: '#ffebee', border: '1px solid #ffcdd2'}}>
                   <div className="rounded-circle me-2" style={{width: '12px', height: '12px', border: '2px solid #ea5455'}}></div>
                   <span style={{fontSize: '14px', color: '#555'}}>Darurat / Batal</span>
                 </div>
                 <div className="p-2 px-3 rounded d-flex align-items-center" style={{background: '#e3f2fd', border: '1px solid #bbdefb'}}>
                   <div className="rounded-circle me-2" style={{width: '12px', height: '12px', border: '2px solid #00cfe8'}}></div>
                   <span style={{fontSize: '14px', color: '#555'}}>Rombongan / Grup</span>
                 </div>
                 <div className="p-2 px-3 rounded d-flex align-items-center" style={{background: '#f3e5f5', border: '1px solid #e1bee7'}}>
                   <div className="rounded-circle me-2" style={{width: '12px', height: '12px', border: '2px solid #ce93d8'}}></div>
                   <span style={{fontSize: '14px', color: '#555'}}>Aplikasi (Online)</span>
                 </div>
                 <div className="p-2 px-3 rounded d-flex align-items-center" style={{background: '#e8eaf6', border: '1px solid #c5cae9'}}>
                   <div className="rounded-circle me-2" style={{width: '12px', height: '12px', border: '2px solid #3f51b5'}}></div>
                   <span style={{fontSize: '14px', color: '#555'}}>Reguler (Biasa)</span>
                 </div>
               </div>
             </div>
          </div>

          <div className="col-lg-9 col-md-8">
            <div className="card bg-white shadow-sm border-0" style={{borderRadius: '8px'}}>
              <div className="card-body">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  headerToolbar={{
                    left: "today prev,next",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  initialView="dayGridMonth"
                  editable={true}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={2} // Limit to 2 events then show "+X more"
                  events={currentEvents} 
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventDrop}
                  height="750px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<span className="fw-bold" style={{fontSize: '18px'}}>
          {!isEditMode && selectedEvent ? "Detail Jadwal Booking" : (isEditMode ? "Ubah Jadwal Booking" : "Tambah Jadwal Baru")}
        </span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        closeIcon={<div style={{background: '#ea5455', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><i className="fas fa-times" style={{fontSize: '12px'}}/></div>}
      >
        {/* VIEW MODE */}
        {!isEditMode && selectedEvent ? (
          <div className="mt-4">
            <h4 className="fw-bold text-dark mb-1">{eventTitle}</h4>
            <p className="text-muted mb-4"><i className="fas fa-map-marker-alt me-2 text-danger"></i> {eventLocation || "Lokasi tidak ditentukan"}</p>
            
            <div className="row mb-4">
              <div className="col-6">
                <p className="mb-1" style={{fontSize: '12px', color: '#888'}}>Mulai</p>
                <p className="fw-bold text-dark mb-0"><i className="far fa-calendar-alt me-1 text-primary"></i> {eventDate ? eventDate.format('DD MMM YYYY') : ''}</p>
                <p className="fw-bold text-dark"><i className="far fa-clock me-1 text-warning"></i> {startTime ? startTime.format('HH:mm') : ''}</p>
              </div>
              <div className="col-6">
                <p className="mb-1" style={{fontSize: '12px', color: '#888'}}>Selesai</p>
                <p className="fw-bold text-dark mb-0"><i className="far fa-calendar-alt me-1 text-primary"></i> {eventDate ? eventDate.format('DD MMM YYYY') : ''}</p>
                <p className="fw-bold text-dark"><i className="far fa-clock me-1 text-warning"></i> {endTime ? endTime.format('HH:mm') : ''}</p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded" style={{background: '#f8f9fa', border: '1px solid #eee'}}>
              <p className="mb-1 fw-bold" style={{fontSize: '13px', color: '#555'}}>Keterangan:</p>
              <p className="mb-0 text-dark" style={{fontSize: '14px'}}>{eventDescription || "-"}</p>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button className="btn btn-danger text-white fw-bold me-auto" onClick={handleDeleteBooking} disabled={loading}>
                <i className="fas fa-trash-alt me-1"></i> Hapus
              </button>
              <button className="btn text-white fw-bold" style={{background: '#0f2650', padding: '8px 24px'}} onClick={() => setIsEditMode(true)}>
                <i className="fas fa-edit me-1"></i> Ubah
              </button>
            </div>
          </div>
        ) : (
          /* EDIT / CREATE MODE */
          <div>
            <div className="form-group mt-4 mb-3">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Nama Pemesan / Acara <span className="text-danger">*</span></label>
              <input 
                className="form-control" 
                type="text" 
                value={eventTitle} 
                onChange={(e) => setEventTitle(e.target.value)} 
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Tanggal Acara <span className="text-danger">*</span></label>
              <DatePicker 
                className="w-100 form-control" 
                format="DD/MM/YYYY"
                value={eventDate}
                onChange={(date) => setEventDate(date)}
              />
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Waktu Mulai <span className="text-danger">*</span></label>
                  <TimePicker 
                    className="w-100 form-control" 
                    format="HH:mm"
                    value={startTime}
                    onChange={(time) => setStartTime(time)}
                  />
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Waktu Selesai <span className="text-danger">*</span></label>
                  <TimePicker 
                    className="w-100 form-control" 
                    format="HH:mm"
                    value={endTime}
                    onChange={(time) => setEndTime(time)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Lokasi / Nomor Meja <span className="text-danger">*</span></label>
              <input 
                className="form-control" 
                type="text" 
                value={eventLocation} 
                onChange={(e) => setEventLocation(e.target.value)} 
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Kategori / Tipe <span className="text-danger">*</span></label>
              <select 
                className="form-select form-control" 
                value={categoryColor} 
                onChange={(e) => setCategoryColor(e.target.value)}
              >
                <option value="bg-primary">Reguler (Biasa)</option>
                <option value="bg-success">VIP / Penting</option>
                <option value="bg-danger">Darurat / Batal</option>
                <option value="bg-warning">Menunggu (Tunggu)</option>
                <option value="bg-info">Rombongan / Grup</option>
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Keterangan Tambahan <span className="text-danger">*</span></label>
              <textarea 
                className="form-control" 
                rows="3"
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)} 
              ></textarea>
            </div>
            
            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button className="btn text-dark fw-bold bg-light border me-auto" style={{padding: '8px 24px'}} onClick={() => {
                if (selectedEvent) {
                  setIsEditMode(false); // Back to view mode
                } else {
                  setIsModalVisible(false); // Close completely if creating
                }
              }} disabled={loading}>
                Batal
              </button>
              <button className="btn text-white fw-bold" style={{background: '#ff9f43', padding: '8px 24px'}} onClick={handleSaveBooking} disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Jadwal"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Calendar;
