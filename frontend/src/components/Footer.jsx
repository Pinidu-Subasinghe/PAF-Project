export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        
        {/* Grid Layout */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h2 className="text-lg font-semibold text-slate-800">
              🎓 Smart Campus Hub
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              A unified platform to manage campus facilities, bookings, and maintenance workflows efficiently.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Platform
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li className="hover:text-slate-700 cursor-pointer">Facilities</li>
              <li className="hover:text-slate-700 cursor-pointer">Bookings</li>
              <li className="hover:text-slate-700 cursor-pointer">Incidents</li>
              <li className="hover:text-slate-700 cursor-pointer">Notifications</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Institute
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li className="hover:text-slate-700 cursor-pointer">About Us</li>
              <li className="hover:text-slate-700 cursor-pointer">Careers</li>
              <li className="hover:text-slate-700 cursor-pointer">Contact</li>
              <li className="hover:text-slate-700 cursor-pointer">Support</li>
              <li className="hover:text-slate-700 cursor-pointer">Terms</li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Follow Us
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li className="hover:text-slate-700 cursor-pointer">Facebook</li>
              <li className="hover:text-slate-700 cursor-pointer">Twitter</li>
              <li className="hover:text-slate-700 cursor-pointer">YouTube</li>
              <li className="hover:text-slate-700 cursor-pointer">LinkedIn</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-slate-200"></div>

        {/* Bottom Row */}
        
        <div className="flex items-center justify-center text-sm text-slate-500 text-center">
          <p>
            © {new Date().getFullYear()} Smart Campus Hub. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}