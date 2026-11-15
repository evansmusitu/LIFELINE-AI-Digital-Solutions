import type { ReactNode } from 'react'
import { BUSINESS, OLD_TEXT } from './data'
import { OldSlide } from './parts'

/*
 * Kopje Spring's 2014 website, as it was before the redesign. A fixed 960 px layout, so phones shrink it to fit.
 * Only ever shown as a picture inside the comparison, so it has no real links or form controls.
 */

const NAV = ['HOME', 'ABOUT US', 'OUR SERVICES', 'BOREHOLE DRILLING', 'SOLAR PUMPS & TANKS', 'WATER TESTING', 'GALLERY', 'NEWS & EVENTS', 'CONTACT US']

const SERVICES = [
  'Borehole siting (using the latest geophysical survey equipment)',
  'Borehole drilling for domestic, commercial, agricultural and institutional clients',
  'Borehole casing, gravel packing and flushing',
  'Pump installation (submersible, solar and hand pumps)',
  'Supply and installation of water tanks and tank stands',
  'Water quality testing and treatment',
  'Borehole rehabilitation and maintenance',
  'Irrigation systems and general plumbing',
]

const FIELDS = ['Title', 'First Name *', 'Surname *', 'Company Name', 'E-mail Address *', 'Telephone', 'Fax Number', 'Physical Address']

const LINK = '#86b3e0'

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-[14px] border border-[#cfd8e3] bg-[#f7f9fb]">
      <p className="bg-[linear-gradient(#6fa3d8,#3b6ea8)] px-[8px] py-[5px] text-[12px] font-bold text-white [text-shadow:1px_1px_0_#2a4f7c]">{title}</p>
      <div className="p-[8px]">{children}</div>
    </div>
  )
}

export function OldSite() {
  return (
    <div className="min-h-full bg-[repeating-linear-gradient(45deg,#d4d4d4_0_2px,#dedede_2px_7px)] pb-[30px]" style={{ fontFamily: 'Tahoma, Verdana, Geneva, sans-serif', color: OLD_TEXT }}>
      <div className="mx-auto w-[960px] bg-white text-[12px] leading-[1.45] shadow-[0_0_12px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between bg-[#1d3f73] px-[10px] py-[4px] text-[11px] text-[#9fb6d9]">
          <span>Welcome to {BUSINESS.legalName} | E-mail: {BUSINESS.email}</span>
          <span className="flex items-center gap-[4px]">
            <span className="inline-block h-[16px] w-[130px] border border-[#7f9db9] bg-white px-[3px] text-[10px] leading-[14px] text-[#b5b5b5]">Search...</span>
            <span className="inline-block h-[16px] border border-[#7f9db9] bg-[linear-gradient(#fff,#d9d9d9)] px-[5px] text-[10px] leading-[14px] text-[#444]">Go</span>
          </span>
        </div>

        <div className="flex items-center justify-between px-[16px] py-[14px]">
          <div className="flex items-center gap-[10px]">
            <svg viewBox="0 0 40 52" className="h-[58px] w-[44px]" aria-hidden="true">
              <path d="M20 2C20 2 3 24 3 34a17 17 0 0 0 34 0C37 24 20 2 20 2Z" fill="#3b82c4" stroke="#1d3f73" strokeWidth="2" />
              <ellipse cx="13" cy="30" rx="4" ry="8" fill="#fff" opacity="0.55" />
            </svg>
            <div>
              <p className="text-[30px] leading-none font-black tracking-[1px] text-[#2a5f9e] [font-family:'Arial_Black',Impact,sans-serif] [text-shadow:2px_2px_0_#c9d9ec]">
                KOPJE SPRING DRILLING
              </p>
              <p className="mt-[4px] text-[14px] text-[#8a9bb0] italic [font-family:Georgia,'Times_New_Roman',serif]">Borehole Drilling Specialists Since 2009</p>
            </div>
          </div>
          <div className="grid size-[92px] rotate-[-8deg] place-items-center rounded-full border-[3px] border-dashed border-[#f6d34a] bg-[#e23b2e] text-center text-[13px] leading-tight font-black text-[#ffe66d] shadow-[2px_2px_4px_rgba(0,0,0,0.4)]">
            FREE SITE
            <br />
            VISITS*
          </div>
        </div>

        <div className="flex flex-wrap border-y border-[#1d3f73] bg-[linear-gradient(#78aee3,#3a6fae_50%,#2d5f9c_51%,#356aa8)]">
          {NAV.map((item, i) => (
            <span
              key={item}
              className={`border-r border-[#5c8cc4] px-[19px] py-[9px] text-[13px] font-bold text-white [text-shadow:1px_1px_0_#1d3f73] ${i === 0 ? 'bg-[#1d3f73]' : ''}`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="relative h-[300px] overflow-hidden border-b-[4px] border-[#2d5f9c]">
          <OldSlide className="absolute inset-0 h-full w-full" />
          <p className="absolute bottom-[34px] left-[30px] bg-[rgba(0,0,0,0.55)] px-[14px] py-[8px] text-[20px] font-bold text-white [font-family:'Arial_Black',Impact,sans-serif]">
            QUALITY BOREHOLE DRILLING AT AFFORDABLE PRICES
          </p>
          {['‹', '›'].map((arrow, i) => (
            <span
              key={arrow}
              className={`absolute top-1/2 grid h-[54px] w-[34px] -translate-y-1/2 place-items-center bg-[rgba(0,0,0,0.45)] text-[34px] leading-none text-white ${i ? 'right-0' : 'left-0'}`}
            >
              {arrow}
            </span>
          ))}
          <span className="absolute right-[24px] bottom-[12px] flex gap-[6px]">
            {[0, 1, 2, 3, 4].map((dot) => (
              <span key={dot} className={`size-[10px] rounded-full border border-white ${dot === 0 ? 'bg-white' : 'bg-transparent'}`} />
            ))}
          </span>
        </div>

        <p className="border-b border-[#e6d77a] bg-[#fff8c4] px-[10px] py-[4px] text-[11px] text-[#a8973f]">
          <b>LATEST NEWS:</b> We are now drilling in Mashonaland East and Mashonaland Central!!! Contact us today for more information......
        </p>

        <div className="flex gap-[20px] px-[16px] py-[18px]">
          <div className="w-[620px]">
            <p className="mb-[10px] text-[22px] text-[#6b8fb8] [font-family:Georgia,'Times_New_Roman',serif]">Welcome to our website</p>
            <p className="mb-[10px] text-justify">
              {BUSINESS.legalName} was established in 2009 and is a 100% Zimbabwean owned company specialising in borehole siting,
              borehole drilling, pump installation and all related water services. Our offices are located in Msasa, Harare and we
              service clients throughout Zimbabwe including Harare, Chitungwiza, Ruwa, Norton, Marondera and surrounding areas.
            </p>
            <p className="mb-[10px] text-justify">
              We are committed to providing our valued clients with a professional, efficient and cost effective service at all times.
              Our team of qualified and experienced personnel use modern equipment to ensure that every job is completed to the highest
              standards. We cater for domestic, commercial, agricultural and institutional clients and no job is too big or too small.
            </p>
            <p className="mb-[14px] text-justify">
              Please browse our website to find out more about the services we offer. For a quotation please fill in the online enquiry
              form below or contact our offices during normal working hours. We look forward to doing business with you.
            </p>
            <p className="mb-[6px] text-[15px] text-[#6b8fb8] [font-family:Georgia,'Times_New_Roman',serif]">Our Services</p>
            <ul className="mb-[8px]">
              {SERVICES.map((s) => (
                <li key={s}>
                  <span style={{ color: LINK }}>»</span> {s}
                </li>
              ))}
            </ul>
            <p className="mb-[18px]">
              Please contact us for a quotation.{' '}
              <span className="underline" style={{ color: LINK }}>
                Click here to read more &gt;&gt;
              </span>
            </p>

            <div className="border border-[#cfd8e3]">
              <p className="bg-[linear-gradient(#eef3f8,#d9e3ee)] px-[8px] py-[5px] text-[13px] font-bold text-[#6b8fb8]">Online Enquiry Form</p>
              <div className="p-[10px]">
                <p className="mb-[8px] text-[11px] text-[#e06b6b]">Fields marked with * are compulsory</p>
                {FIELDS.map((field) => (
                  <div key={field} className="mb-[5px] flex items-center">
                    <span className="w-[150px] text-[11px]">{field}</span>
                    <span className={`inline-block h-[18px] border border-[#b5b5b5] bg-white ${field === 'Title' ? 'w-[70px]' : 'w-[260px]'}`}>
                      {field === 'Title' && <span className="float-right px-[3px] text-[9px] leading-[16px] text-[#888]">▼</span>}
                    </span>
                  </div>
                ))}
                <div className="mb-[8px] flex">
                  <span className="w-[150px] text-[11px]">Your Enquiry *</span>
                  <span className="inline-block h-[70px] w-[360px] border border-[#b5b5b5] bg-white" />
                </div>
                <div className="ml-[150px] flex gap-[6px]">
                  {['Submit', 'Reset'].map((label) => (
                    <span key={label} className="border border-[#8a8a8a] bg-[linear-gradient(#fff,#d4d4d4)] px-[12px] py-[2px] text-[11px] text-[#444]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-[288px]">
            <Box title="QUICK LINKS">
              {['Borehole Drilling', 'Solar Pumps', 'Tanks & Tank Stands', 'Water Testing', 'Photo Gallery', 'Download Company Profile (PDF)'].map((link) => (
                <p key={link} className="border-b border-dotted border-[#d5dde6] py-[3px]" style={{ color: LINK }}>
                  › {link}
                </p>
              ))}
            </Box>
            <Box title="LATEST NEWS">
              {[
                ['12/03/2014', 'Our new drilling rig has arrived'],
                ['28/01/2014', 'Now servicing Mashonaland East'],
                ['05/11/2013', 'Solar pump special offers this festive season'],
              ].map(([date, title]) => (
                <p key={date} className="mb-[6px]">
                  <span className="text-[10px]">{date}</span>
                  <br />
                  <span style={{ color: LINK }}>{title}</span>
                </p>
              ))}
            </Box>
            <Box title="NEWSLETTER">
              <p className="mb-[6px]">Subscribe to our newsletter for the latest news and special offers.</p>
              <span className="mb-[6px] block h-[18px] border border-[#b5b5b5] bg-white px-[3px] text-[10px] leading-[16px] text-[#c0c0c0]">Enter your e-mail</span>
              <span className="border border-[#8a8a8a] bg-[linear-gradient(#fff,#d4d4d4)] px-[10px] py-[1px] text-[11px] text-[#444]">Subscribe</span>
            </Box>
            <div className="text-center text-[11px]">
              <p>You are visitor number</p>
              <p className="mt-[4px] inline-flex gap-[2px]">
                {'004217'.split('').map((digit, i) => (
                  <span key={i} className="bg-black px-[4px] font-mono text-[14px] text-[#5df35d]">
                    {digit}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#3a3a3a] px-[10px] py-[12px] text-center text-[11px] text-[#8c8c8c]">
          <p>
            Home | About Us | Our Services | Gallery | Contact Us
          </p>
          <p className="mt-[4px]">
            Tel: {BUSINESS.phone} | E-mail: {BUSINESS.email} | {BUSINESS.yard}
          </p>
          <p className="mt-[4px]">Copyright © 2014 {BUSINESS.legalName}. All Rights Reserved. Best viewed at 1024 x 768.</p>
        </div>
      </div>
    </div>
  )
}
